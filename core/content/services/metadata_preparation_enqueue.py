"""Bound and fairly admit identity-only metadata preparation requests."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from content.models import ContentMetadataPreparationCursor, ContentMetadataPreparationJob


MAX_PENDING_METADATA_PREPARATION_JOBS = 1_000
ACTIVE_STATUSES = (
    ContentMetadataPreparationJob.Status.QUEUED,
    ContentMetadataPreparationJob.Status.LEASED,
    ContentMetadataPreparationJob.Status.RETRY,
)


def enqueue_metadata_preparation(content_item_ids: list[int]) -> int:
    """Persist missing-detail intent without making a provider request.

    Caller passes only identities whose normalized type-specific detail is
    absent in the already-fetched resolver result. The singleton cursor makes
    repeated capped admissions rotate through those identities as capacity
    becomes available. The database cap bounds future provider work.
    """
    if not content_item_ids:
        return 0

    with transaction.atomic():
        cursor = ContentMetadataPreparationCursor.objects.select_for_update().get(pk=1)
        existing_ids = set(
            ContentMetadataPreparationJob.objects.filter(
                content_item_id__in=content_item_ids,
            ).values_list('content_item_id', flat=True)
        )
        candidates = [item_id for item_id in set(content_item_ids) - existing_ids]
        if not candidates:
            return 0

        active_count = ContentMetadataPreparationJob.objects.filter(
            status__in=ACTIVE_STATUSES,
        ).count()
        slots = max(0, MAX_PENDING_METADATA_PREPARATION_JOBS - active_count)
        if not slots:
            return 0

        last_id = cursor.last_admitted_content_item_id
        candidates.sort(key=lambda item_id: (item_id <= last_id if last_id else False, item_id))
        admitted = candidates[:slots]
        if not admitted:
            return 0

        now = timezone.now()
        ContentMetadataPreparationJob.objects.bulk_create([
            ContentMetadataPreparationJob(
                content_item_id=item_id,
                status=ContentMetadataPreparationJob.Status.QUEUED,
                available_at=now,
            )
            for item_id in admitted
        ], ignore_conflicts=True)
        cursor.last_admitted_content_item_id = admitted[-1]
        cursor.save(update_fields=('last_admitted_content_item_id',))
        return len(admitted)
