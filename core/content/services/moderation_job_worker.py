"""Lease and execute durable moderation jobs without holding network locks."""
from __future__ import annotations

import logging
import time
import uuid
from dataclasses import dataclass, field
from datetime import timedelta

from django.conf import settings
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from content.models import ContentModerationJob, ContentModerationJudgment
from content.services.moderation_service import (
    PROVIDER_RULE_MODEL,
    ModerationClassificationOutcome,
    classify_content_item,
)

logger = logging.getLogger(__name__)

RETRYABLE_FAILURES = frozenset({'typesafe_config', 'typesafe_rate_limited'})
DEFAULT_MAX_ATTEMPTS = 5
DEFAULT_BASE_BACKOFF_SECONDS = 5
DEFAULT_MAX_BACKOFF_SECONDS = 900


@dataclass
class WorkerResult:
    """Aggregate outcomes suitable for safe operational logging."""

    counts: dict[str, int] = field(default_factory=dict)
    duration_ms: int = 0

    def add(self, status: str) -> None:
        self.counts[status] = self.counts.get(status, 0) + 1


def claim_moderation_jobs(*, batch_size: int, lease_seconds: int) -> list[tuple[int, uuid.UUID]]:
    """Claim ready jobs in a short transaction and return opaque fencing tokens."""
    if batch_size < 1 or lease_seconds < 1:
        raise ValueError('batch_size and lease_seconds must be positive')

    now = timezone.now()
    claimed: list[tuple[int, uuid.UUID]] = []
    with transaction.atomic():
        # An expired lease cannot tell us whether the remote request was sent.
        # It is terminally ambiguous, never a routine retry.
        ContentModerationJob.objects.filter(
            status=ContentModerationJob.Status.LEASED,
            lease_until__lte=now,
        ).update(
            status=ContentModerationJob.Status.OUTCOME_UNKNOWN,
            lease_token=None,
            lease_until=None,
            last_error_code='lease_expired_outcome_unknown',
            updated_at=now,
        )

        ready = ContentModerationJob.objects.filter(
            status__in=(ContentModerationJob.Status.QUEUED, ContentModerationJob.Status.RETRY),
            available_at__lte=now,
        ).order_by('available_at', 'id').select_for_update(skip_locked=True)[:batch_size]
        for job in ready:
            token = uuid.uuid4()
            changed = ContentModerationJob.objects.filter(
                pk=job.pk,
                status__in=(ContentModerationJob.Status.QUEUED, ContentModerationJob.Status.RETRY),
            ).update(
                status=ContentModerationJob.Status.LEASED,
                lease_token=token,
                lease_until=now + timedelta(seconds=lease_seconds),
                attempts=job.attempts + 1,
                updated_at=now,
            )
            if changed:
                claimed.append((job.pk, token))
    return claimed


def run_moderation_batch(
    *,
    batch_size: int = 10,
    lease_seconds: int = 120,
    max_attempts: int = DEFAULT_MAX_ATTEMPTS,
    base_backoff_seconds: int = DEFAULT_BASE_BACKOFF_SECONDS,
    max_backoff_seconds: int = DEFAULT_MAX_BACKOFF_SECONDS,
    classifier=None,
) -> WorkerResult:
    """Claim and process one bounded batch; this function performs no backfill."""
    started = time.monotonic()
    result = WorkerResult()
    if not settings.MODERATION_CLASSIFICATION_ENABLED:
        result.add('disabled')
        result.duration_ms = round((time.monotonic() - started) * 1000)
        return result

    result.counts['lease_expired'] = expire_ambiguous_leases()
    claims = claim_moderation_jobs(batch_size=batch_size, lease_seconds=lease_seconds)
    classify = classifier or classify_content_item
    for job_id, token in claims:
        result.add(
            process_claim(
                job_id,
                token,
                classifier=classify,
                max_attempts=max_attempts,
                base_backoff_seconds=base_backoff_seconds,
                max_backoff_seconds=max_backoff_seconds,
            )
        )
    result.duration_ms = round((time.monotonic() - started) * 1000)
    return result


def expire_ambiguous_leases(*, now=None) -> int:
    """Mark abandoned leases unknown; never resend after a crash or timeout."""
    now = now or timezone.now()
    return ContentModerationJob.objects.filter(
        status=ContentModerationJob.Status.LEASED,
        lease_until__lte=now,
    ).update(
        status=ContentModerationJob.Status.OUTCOME_UNKNOWN,
        lease_token=None,
        lease_until=None,
        last_error_code='lease_expired_outcome_unknown',
        updated_at=now,
    )


def process_claim(
    job_id,
    lease_token,
    *,
    classifier,
    max_attempts=DEFAULT_MAX_ATTEMPTS,
    base_backoff_seconds=DEFAULT_BASE_BACKOFF_SECONDS,
    max_backoff_seconds=DEFAULT_MAX_BACKOFF_SECONDS,
):
    """Run one classifier outside locks and fence all state writes by token."""
    job = ContentModerationJob.objects.select_related('content_item').filter(
        pk=job_id,
        status=ContentModerationJob.Status.LEASED,
        lease_token=lease_token,
    ).first()
    if job is None:
        return 'fenced'

    if not _job_is_current(job):
        return 'superseded' if _finish(
            job, lease_token, ContentModerationJob.Status.SUPERSEDED
        ) else 'fenced'

    if _has_current_success(job):
        return 'reused' if _finish(job, lease_token, ContentModerationJob.Status.DONE) else 'fenced'

    try:
        outcome = classifier(job.content_item, model=job.requested_model)
    except Exception:  # noqa: BLE001 - unknown remote outcome must not be retried
        # Exception text/tracebacks may include state or provider details.
        logger.error('moderation_worker: classifier raised; outcome is unknown')
        return 'outcome_unknown' if _finish(
            job,
            lease_token,
            ContentModerationJob.Status.OUTCOME_UNKNOWN,
            error_code='worker_exception_outcome_unknown',
        ) else 'fenced'

    # A source refresh can commit while the remote call is in flight.
    job.content_item.refresh_from_db(fields=('current_moderation_source_hash',))
    if not _job_is_current(job):
        return 'superseded' if _finish(
            job, lease_token, ContentModerationJob.Status.SUPERSEDED
        ) else 'fenced'

    if isinstance(outcome, ModerationClassificationOutcome):
        if outcome.kind == 'skipped' and outcome.code == 'moderation_disabled':
            delay = min(max_backoff_seconds, max(1, base_backoff_seconds))
            return _schedule_retry(job, lease_token, outcome.code, delay, max_attempts)
        if outcome.kind == 'skipped':
            return 'failed' if _finish(
                job,
                lease_token,
                ContentModerationJob.Status.FAILED,
                error_code=outcome.code,
            ) else 'fenced'
        if outcome.kind == 'unavailable' and outcome.code in RETRYABLE_FAILURES:
            delay = retry_delay_seconds(
                job.attempts,
                base_backoff_seconds=base_backoff_seconds,
                max_backoff_seconds=max_backoff_seconds,
            )
            return _schedule_retry(job, lease_token, outcome.code, delay, max_attempts)
        return 'outcome_unknown' if _finish(
            job,
            lease_token,
            ContentModerationJob.Status.OUTCOME_UNKNOWN,
            error_code=_safe_error_code(outcome.code),
        ) else 'fenced'

    if (
        isinstance(outcome, ContentModerationJudgment)
        and outcome.status == ContentModerationJudgment.Status.COMPLETE
        and outcome.source_data_hash == job.source_data_hash
        and outcome.content_item_id == job.content_item_id
    ):
        return 'done' if _finish(job, lease_token, ContentModerationJob.Status.DONE) else 'fenced'

    return 'outcome_unknown' if _finish(
        job,
        lease_token,
        ContentModerationJob.Status.OUTCOME_UNKNOWN,
        error_code='invalid_classifier_result',
    ) else 'fenced'


def _job_is_current(job) -> bool:
    return (
        job.content_item.current_moderation_source_hash == job.source_data_hash
        and job.question_revision == settings.MODERATION_QUESTION_REVISION
    )


def _has_current_success(job) -> bool:
    return ContentModerationJudgment.objects.filter(
        content_item_id=job.content_item_id,
        source_data_hash=job.source_data_hash,
        question_revision=job.question_revision,
        status=ContentModerationJudgment.Status.COMPLETE,
    ).filter(
        Q(model_name=job.requested_model)
        | Q(payload__requested_model=job.requested_model)
        | Q(model_name=PROVIDER_RULE_MODEL)
    ).exists()


def _finish(job, lease_token, status, *, error_code=''):
    now = timezone.now()
    changed = ContentModerationJob.objects.filter(
        pk=job.pk,
        status=ContentModerationJob.Status.LEASED,
        lease_token=lease_token,
    ).update(
        status=status,
        lease_token=None,
        lease_until=None,
        last_error_code=_safe_error_code(error_code),
        completed_at=now if status in (
            ContentModerationJob.Status.DONE,
            ContentModerationJob.Status.SUPERSEDED,
            ContentModerationJob.Status.FAILED,
            ContentModerationJob.Status.OUTCOME_UNKNOWN,
        ) else None,
        updated_at=now,
    )
    return changed == 1


def _schedule_retry(job, lease_token, error_code, delay_seconds, max_attempts):
    attempts = ContentModerationJob.objects.filter(
        pk=job.pk,
        status=ContentModerationJob.Status.LEASED,
        lease_token=lease_token,
    ).values_list('attempts', flat=True).first()
    if attempts is None:
        return 'fenced'
    if attempts >= max_attempts:
        _finish(job, lease_token, ContentModerationJob.Status.FAILED, error_code=error_code)
        return 'failed'
    now = timezone.now()
    changed = ContentModerationJob.objects.filter(
        pk=job.pk,
        status=ContentModerationJob.Status.LEASED,
        lease_token=lease_token,
    ).update(
        status=ContentModerationJob.Status.RETRY,
        available_at=now + timedelta(seconds=max(1, delay_seconds)),
        lease_token=None,
        lease_until=None,
        last_error_code=_safe_error_code(error_code),
        completed_at=None,
        updated_at=now,
    )
    return 'retry' if changed == 1 else 'fenced'


def retry_delay_seconds(attempt, *, base_backoff_seconds, max_backoff_seconds):
    exponent = max(0, min(30, attempt - 1))
    return min(max_backoff_seconds, base_backoff_seconds * (2**exponent))


def _safe_error_code(value):
    if not isinstance(value, str) or not value:
        return ''
    # Persist only bounded domain codes, not exception text or provider payloads.
    return ''.join(char for char in value[:64] if char.isalnum() or char in '_-')
