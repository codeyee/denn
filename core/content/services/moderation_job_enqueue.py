"""Create durable moderation outbox rows inside normalized-detail writes."""
from __future__ import annotations

from django.conf import settings
from django.db import connection
from django.db.models import Q
from django.utils import timezone

from content.models import ContentItem, ContentModerationJob, ContentModerationJudgment


PROVIDER_RULE_MODEL = 'provider-rule:v1'
REQUEUEABLE_STATUSES = (ContentModerationJob.Status.QUEUED, ContentModerationJob.Status.RETRY)


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
    ).filter(
        Q(model_name=requested_model)
        | Q(payload__requested_model=requested_model)
        | Q(model_name=PROVIDER_RULE_MODEL)
    ).exists()

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
