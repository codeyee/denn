"""Prepare normalized detail for homepage-only content identities."""
from __future__ import annotations

import logging
import time
import uuid
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from content.models import ContentItem, ContentMetadataPreparationJob
from content.services.local_content_store import detail_for
from content.services.moderation_job_enqueue import enqueue_current_moderation_job
from content.services.moderation_source_hash import persist_current_moderation_source_hash
from content.services.source_data_orchestrator import fetch_bulk_source_data

logger = logging.getLogger(__name__)

DEFAULT_BATCH_SIZE = 10
MAX_BATCH_SIZE = 100
DEFAULT_MAX_ATTEMPTS = 5
DEFAULT_BASE_BACKOFF_SECONDS = 5
DEFAULT_MAX_BACKOFF_SECONDS = 900
DEFAULT_LEASE_SECONDS = 300
MIN_LEASE_SECONDS = DEFAULT_LEASE_SECONDS
_DETAIL_RELATED_NAMES = (
    'movie_detail', 'tv_show_detail', 'season_detail', 'album_detail',
    'game_detail', 'book_detail',
)


@dataclass
class WorkerResult:
    """Bounded aggregate result safe to log without provider data."""

    counts: dict[str, int] = field(default_factory=dict)
    duration_ms: int = 0

    def add(self, status: str) -> None:
        self.counts[status] = self.counts.get(status, 0) + 1


def claim_metadata_preparation_jobs(
    *, batch_size: int = DEFAULT_BATCH_SIZE,
    lease_seconds: int = DEFAULT_LEASE_SECONDS,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
) -> list[tuple[int, uuid.UUID]]:
    """Claim due jobs under short row locks; provider calls happen after commit."""
    if not 1 <= batch_size <= MAX_BATCH_SIZE:
        raise ValueError(f'batch_size must be between 1 and {MAX_BATCH_SIZE}')
    if lease_seconds < MIN_LEASE_SECONDS or max_attempts < 1:
        raise ValueError(f'lease_seconds must be at least {MIN_LEASE_SECONDS}; max_attempts must be positive')

    now = timezone.now()
    ready_statuses = (
        ContentMetadataPreparationJob.Status.QUEUED,
        ContentMetadataPreparationJob.Status.RETRY,
    )
    claimed: list[tuple[int, uuid.UUID]] = []
    with transaction.atomic():
        expired = ContentMetadataPreparationJob.objects.filter(
            status=ContentMetadataPreparationJob.Status.LEASED,
            lease_until__lte=now,
        )
        expired.filter(attempts__gte=max_attempts).update(
            status=ContentMetadataPreparationJob.Status.FAILED,
            lease_token=None,
            lease_until=None,
            last_error_code='lease_expired_attempts_exhausted',
            completed_at=now,
            updated_at=now,
        )
        expired.filter(attempts__lt=max_attempts).update(
            status=ContentMetadataPreparationJob.Status.RETRY,
            available_at=now,
            lease_token=None,
            lease_until=None,
            last_error_code='lease_expired_retry',
            completed_at=None,
            updated_at=now,
        )

        jobs = (
            ContentMetadataPreparationJob.objects
            .filter(status__in=ready_statuses, available_at__lte=now)
            .order_by('available_at', 'id')
            .select_for_update(skip_locked=True)[:batch_size]
        )
        for job in jobs:
            token = uuid.uuid4()
            changed = ContentMetadataPreparationJob.objects.filter(
                pk=job.pk, status__in=ready_statuses,
            ).update(
                status=ContentMetadataPreparationJob.Status.LEASED,
                lease_token=token,
                lease_until=now + timedelta(seconds=lease_seconds),
                attempts=job.attempts + 1,
                updated_at=now,
            )
            if changed:
                claimed.append((job.pk, token))
    return claimed


def run_metadata_preparation_batch(
    *, batch_size: int = DEFAULT_BATCH_SIZE,
    lease_seconds: int = DEFAULT_LEASE_SECONDS,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
    base_backoff_seconds: int = DEFAULT_BASE_BACKOFF_SECONDS,
    max_backoff_seconds: int = DEFAULT_MAX_BACKOFF_SECONDS,
    fetcher=None,
) -> WorkerResult:
    """Fetch and persist one bounded batch. This performs no startup scan/backfill."""
    _validate_options(batch_size, lease_seconds, max_attempts,
                      base_backoff_seconds, max_backoff_seconds)
    started = time.monotonic()
    result = WorkerResult()
    claims = claim_metadata_preparation_jobs(
        batch_size=batch_size,
        lease_seconds=lease_seconds,
        max_attempts=max_attempts,
    )
    if not claims:
        result.duration_ms = round((time.monotonic() - started) * 1000)
        return result

    jobs = list(
        ContentMetadataPreparationJob.objects
        .filter(pk__in=[job_id for job_id, _token in claims])
        .select_related('content_item', *(f'content_item__{name}' for name in _DETAIL_RELATED_NAMES))
        .order_by('id')
    )
    tokens = dict(claims)
    existing_detail = []
    missing_detail = []
    for job in jobs:
        (existing_detail if detail_for(job.content_item) is not None else missing_detail).append(job)

    for job in existing_detail:
        reconciled = _reconcile_existing_detail(job.content_item_id, job.pk, tokens[job.pk])
        if reconciled is None:
            result.add(_retry_or_fail(
                job.pk,
                tokens[job.pk],
                attempts=job.attempts,
                max_attempts=max_attempts,
                base_backoff_seconds=base_backoff_seconds,
                max_backoff_seconds=max_backoff_seconds,
            ))
            continue
        if not reconciled:
            result.add('fenced')
            continue
        result.add(
            'done' if _finish(job.pk, tokens[job.pk], ContentMetadataPreparationJob.Status.DONE)
            else 'fenced'
        )

    if missing_detail:
        # The lock/lease transaction above has committed before this call. The
        # canonical orchestrator groups missing identities by provider family,
        # persists valid responses through normalized writers, and triggers the
        # source-hash/moderation outbox path atomically.
        load_items = list(
            ContentItem.objects.filter(pk__in=[job.content_item_id for job in missing_detail])
            .select_related(*_DETAIL_RELATED_NAMES)
        )
        jobs_by_content_id = {job.content_item_id: job for job in missing_detail}
        try:
            if fetcher is None:
                source_data = fetch_bulk_source_data(
                    load_items,
                    persistence_guard=lambda item: _active_lease(
                        jobs_by_content_id[item.pk].pk,
                        tokens[jobs_by_content_id[item.pk].pk],
                    ),
                )
            else:
                source_data = fetcher(load_items)
        except Exception:
            # Do not log exception text or provider payloads. GETs are
            # idempotent, so a bounded retry is safe.
            logger.warning('metadata_preparation_fetch_failed')
            source_data = {}

        persisted_items = {
            item.pk: item for item in ContentItem.objects.filter(
                pk__in=[job.content_item_id for job in missing_detail]
            ).select_related(*_DETAIL_RELATED_NAMES)
        }
        for job in missing_detail:
            has_payload = isinstance(source_data, dict) and bool(source_data.get(job.content_item_id))
            has_detail = detail_for(persisted_items[job.content_item_id]) is not None
            if has_payload and has_detail:
                status = (
                    ContentMetadataPreparationJob.Status.DONE
                    if _finish(job.pk, tokens[job.pk], ContentMetadataPreparationJob.Status.DONE)
                    else None
                )
                if status is None:
                    result.add('fenced')
                else:
                    result.add('done')
            else:
                outcome = _retry_or_fail(
                    job.pk,
                    tokens[job.pk],
                    attempts=job.attempts,
                    max_attempts=max_attempts,
                    base_backoff_seconds=base_backoff_seconds,
                    max_backoff_seconds=max_backoff_seconds,
                )
                result.add(outcome)

    result.duration_ms = round((time.monotonic() - started) * 1000)
    logger.info(
        'metadata_preparation_batch',
        extra={'event': 'metadata_preparation_batch', 'counts': result.counts,
               'duration_ms': result.duration_ms},
    )
    return result


def _finish(job_id, token, status) -> bool:
    now = timezone.now()
    terminal = status in (
        ContentMetadataPreparationJob.Status.DONE,
        ContentMetadataPreparationJob.Status.SUPERSEDED,
        ContentMetadataPreparationJob.Status.FAILED,
        ContentMetadataPreparationJob.Status.OUTCOME_UNKNOWN,
    )
    changed = ContentMetadataPreparationJob.objects.filter(
        pk=job_id,
        status=ContentMetadataPreparationJob.Status.LEASED,
        lease_token=token,
        lease_until__gt=now,
    ).update(
        status=status,
        lease_token=None,
        lease_until=None,
        last_error_code='',
        completed_at=now if terminal else None,
        updated_at=now,
    )
    return changed == 1


@contextmanager
def _active_lease(job_id, token):
    """Hold the prep-job row lock while a guarded normalized write commits."""
    with transaction.atomic():
        job = (
            ContentMetadataPreparationJob.objects
            .select_for_update()
            .filter(
                pk=job_id,
                status=ContentMetadataPreparationJob.Status.LEASED,
                lease_token=token,
            )
            .first()
        )
        yield bool(job and job.lease_until and job.lease_until > timezone.now())


def _reconcile_existing_detail(content_item_id, job_id, token) -> bool | None:
    """Refresh current moderation freshness and enqueue missing work idempotently."""
    with _active_lease(job_id, token) as active:
        if not active:
            return False
        item = (
            ContentItem.objects.select_for_update()
            .filter(pk=content_item_id)
            .select_related(*_DETAIL_RELATED_NAMES)
            .first()
        )
        if item is None or detail_for(item) is None:
            return None
        source_hash = persist_current_moderation_source_hash(item)
        if not source_hash and settings.MODERATION_CLASSIFICATION_ENABLED:
            return None
        enqueue_current_moderation_job(item, source_hash)
        return True


def _retry_or_fail(
    job_id, token, *, attempts, max_attempts, base_backoff_seconds,
    max_backoff_seconds,
) -> str:
    now = timezone.now()
    terminal = attempts >= max_attempts
    status = (
        ContentMetadataPreparationJob.Status.FAILED if terminal
        else ContentMetadataPreparationJob.Status.RETRY
    )
    delay = min(
        max_backoff_seconds,
        base_backoff_seconds * (2 ** min(30, max(0, attempts - 1))),
    )
    changed = ContentMetadataPreparationJob.objects.filter(
        pk=job_id,
        status=ContentMetadataPreparationJob.Status.LEASED,
        lease_token=token,
        lease_until__gt=now,
    ).update(
        status=status,
        available_at=now + timedelta(seconds=max(1, delay)),
        lease_token=None,
        lease_until=None,
        last_error_code='canonical_metadata_unavailable',
        completed_at=now if terminal else None,
        updated_at=now,
    )
    return ('failed' if terminal else 'retry') if changed else 'fenced'


def _validate_options(batch_size, lease_seconds, max_attempts,
                      base_backoff_seconds, max_backoff_seconds):
    if not 1 <= batch_size <= MAX_BATCH_SIZE:
        raise ValueError(f'batch_size must be between 1 and {MAX_BATCH_SIZE}')
    if min(max_attempts, base_backoff_seconds, max_backoff_seconds) < 1:
        raise ValueError('retry options must be positive')
    if lease_seconds < MIN_LEASE_SECONDS:
        raise ValueError(f'lease_seconds must be at least {MIN_LEASE_SECONDS}')
    if base_backoff_seconds > max_backoff_seconds:
        raise ValueError('base_backoff_seconds cannot exceed max_backoff_seconds')
