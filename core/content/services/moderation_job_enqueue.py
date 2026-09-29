"""Create durable moderation outbox rows inside normalized-detail writes."""
from __future__ import annotations

from collections.abc import Sequence

from django.conf import settings
from django.db import connection
from django.db.models import Q
from django.utils import timezone

from content.models import ContentItem, ContentModerationJob, ContentModerationJudgment
from content.services.moderation_service import PROVIDER_RULE_MODELS


REQUEUEABLE_STATUSES = (ContentModerationJob.Status.QUEUED, ContentModerationJob.Status.RETRY)


def _matches_requested_model(requested_model: str) -> Q:
    return (
        Q(model_name=requested_model)
        | Q(payload__requested_model=requested_model)
        | Q(model_name__in=PROVIDER_RULE_MODELS)
    )


def enqueue_current_moderation_job(
    content_item: ContentItem,
    source_data_hash: str | None,
) -> ContentModerationJob | None:
    """Coalesce classification work for the current persisted normalized input.

    The caller must be inside the same transaction that writes the detail and
    current source hash. Only short local database work occurs here; no wake-up
    or remote call is required for correctness.
    """
    if not connection.in_atomic_block:
        raise RuntimeError('moderation jobs must be enqueued in the detail transaction')

    now = timezone.now()
    base_jobs = ContentModerationJob.objects.filter(content_item=content_item)
    if source_data_hash:
        base_jobs.exclude(source_data_hash=source_data_hash).filter(
            status__in=REQUEUEABLE_STATUSES,
        ).update(
            status=ContentModerationJob.Status.SUPERSEDED,
            lease_token=None,
            lease_until=None,
            updated_at=now,
        )
    else:
        base_jobs.filter(status__in=REQUEUEABLE_STATUSES).update(
            status=ContentModerationJob.Status.SUPERSEDED,
            lease_token=None,
            lease_until=None,
            updated_at=now,
        )

    if not source_data_hash or not settings.MODERATION_CLASSIFICATION_ENABLED:
        return None

    from content.services.local_content_store import detail_is_complete

    if not detail_is_complete(content_item):
        return None

    requested_model = settings.MODERATION_MODEL
    question_revision = settings.MODERATION_QUESTION_REVISION
    if not requested_model or not question_revision:
        return None

    has_current_success = ContentModerationJudgment.objects.filter(
        content_item=content_item,
        source_data_hash=source_data_hash,
        question_revision=question_revision,
        status=ContentModerationJudgment.Status.COMPLETE,
    ).filter(_matches_requested_model(requested_model)).exists()

    identity = {
        'content_item': content_item,
        'source_data_hash': source_data_hash,
        'requested_model': requested_model,
        'question_revision': question_revision,
    }
    if has_current_success:
        ContentModerationJob.objects.filter(
            **identity,
            status__in=REQUEUEABLE_STATUSES,
        ).update(
            status=ContentModerationJob.Status.DONE,
            lease_token=None,
            lease_until=None,
            completed_at=now,
            updated_at=now,
        )
        return None

    job, created = ContentModerationJob.objects.get_or_create(
        **identity,
        defaults={
            'status': ContentModerationJob.Status.QUEUED,
            'available_at': now,
        },
    )
    if not created and job.status == ContentModerationJob.Status.SUPERSEDED:
        job.status = ContentModerationJob.Status.QUEUED
        job.available_at = now
        job.lease_token = None
        job.lease_until = None
        job.last_error_code = ''
        job.completed_at = None
        job.save(
            update_fields=(
                'status',
                'available_at',
                'lease_token',
                'lease_until',
                'last_error_code',
                'completed_at',
                'updated_at',
            )
        )
    return job


def enqueue_missing_moderation_jobs(content_items: Sequence[ContentItem]) -> int:
    """Admit one queued job for each resolved item that lacks current work.

    Callers pass items that have normalized detail, annotated by
    `with_moderation_summary`. An item is skipped when a successful judgment
    exists for the current identity or when a job with that exact identity
    exists in any status. That dedupe keeps a failed or outcome_unknown job
    from becoming a second Jev call, so this path never revives one. Cost is at
    most two reads and one insert however many items are passed. Detail
    completeness is not required because the moderation input is text-only and
    the worker re-checks hash freshness before any remote call.
    """
    requested_model = settings.MODERATION_MODEL
    question_revision = settings.MODERATION_QUESTION_REVISION
    if (
        settings.MODERATION_CLASSIFICATION_ENABLED is not True
        or not requested_model
        or not question_revision
    ):
        return 0

    current_hashes = {
        item.pk: item.current_moderation_source_hash
        for item in content_items
        if item.current_moderation_source_hash
    }
    if not current_hashes:
        return 0

    judged_ids = [
        item.pk for item in content_items
        if item.pk in current_hashes and item.moderation_has_judgment
    ]
    settled = set(
        ContentModerationJob.objects.filter(
            content_item_id__in=current_hashes,
            requested_model=requested_model,
            question_revision=question_revision,
        ).values_list('content_item_id', 'source_data_hash')
    )
    if judged_ids:
        settled.update(
            ContentModerationJudgment.objects.filter(
                content_item_id__in=judged_ids,
                question_revision=question_revision,
                status=ContentModerationJudgment.Status.COMPLETE,
            ).filter(_matches_requested_model(requested_model)).values_list(
                'content_item_id', 'source_data_hash',
            )
        )

    now = timezone.now()
    missing = [
        ContentModerationJob(
            content_item_id=item_id,
            source_data_hash=source_hash,
            requested_model=requested_model,
            question_revision=question_revision,
            status=ContentModerationJob.Status.QUEUED,
            available_at=now,
        )
        for item_id, source_hash in current_hashes.items()
        if (item_id, source_hash) not in settled
    ]
    if missing:
        ContentModerationJob.objects.bulk_create(missing, ignore_conflicts=True)
    return len(missing)
