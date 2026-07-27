"""Single source of truth for ingest + freshness of per-type Detail rows.

The previously duplicated `get_or_create` of `ContentItem` (one in
`ContentItemViewSet.get_or_create`, one in `ensure_content_items`, one in
serializers) is centralized here so the public ingest contract has one
place to evolve.

`ensure_content_detail` is the orchestration entry point used by both the
read path (Sprint 7B) and the rehydration command (Sprint 7D).
"""
from __future__ import annotations

import logging
from datetime import timedelta
from typing import Any, Optional, Tuple

from django.utils import timezone

from content.models import ContentItem

from .mappers import MAPPERS
from .refresh_policy import DETAIL_RELATED_NAME, compute_refresh_policy

logger = logging.getLogger(__name__)


def get_or_create_content_item(
    source_api: str,
    external_id: str,
    content_type: str,
) -> Tuple[ContentItem, bool]:
    """Idempotent ingest entry point. Returns `(item, created)`."""
    item, created = ContentItem.objects.get_or_create(
        source_api=source_api,
        external_id=external_id,
        content_type=content_type,
        defaults={},
    )
    return item, created


def detail_for(content_item: ContentItem):
    """Return the Detail instance for this item, or None if missing."""
    related = DETAIL_RELATED_NAME.get(content_item.content_type)
    if not related:
        return None
    try:
        return getattr(content_item, related)
    except Exception:
        return None


def _ttl_for(content_type: str) -> timedelta:
    logger.warning(
        'local_content_store._ttl_for is deprecated; use compute_refresh_policy instead',
        extra={'content_type': content_type},
    )
    return compute_refresh_policy(
        ContentItem(content_type=content_type),
        detail=None,
    ).ttl


def detail_is_fresh(content_item: ContentItem) -> bool:
    """True iff a Detail exists and its `last_refreshed_at` is within TTL."""
    detail = detail_for(content_item)
    if detail is None:
        return False
    last = getattr(detail, 'last_refreshed_at', None)
    if not last:
        return False
    return (timezone.now() - last) <= compute_refresh_policy(
        content_item,
        detail,
    ).ttl


def detail_is_complete(content_item: ContentItem) -> bool:
    """Return whether locally persisted detail satisfies structural invariants."""
    detail = detail_for(content_item)
    if detail is None:
        return False
    if (
        content_item.content_type == ContentItem.ContentType.TV_SHOW
        and (detail.number_of_seasons or 0) > 0
    ):
        return bool(content_item.season_children.all())
    return True


def ensure_content_detail(
    content_item: ContentItem,
    *,
    payload: Optional[dict[str, Any]] = None,
    request_country: Optional[str] = None,
    force: bool = False,
) -> bool:
    """Make sure the per-type Detail for `content_item` is present and fresh.

    If `payload` is supplied we use it directly (caller already paid for
    the proxy fetch). Otherwise we go through `content.utils.fetch_source_data`.

    Returns True if a refresh actually ran, False if the existing Detail
    was already fresh (or if no payload could be obtained).
    """
    if (
        not force
        and detail_is_fresh(content_item)
        and detail_is_complete(content_item)
    ):
        return False

    if payload is None:
        from content.utils import fetch_source_data
        payload = fetch_source_data(content_item, country_code=request_country)

    if not payload:
        logger.debug(
            'ensure_content_detail: no payload available for content_item=%s',
            content_item.id,
        )
        return False

    mapper = MAPPERS.get(content_item.content_type)
    if not mapper:
        logger.warning(
            'ensure_content_detail: no mapper for content_type=%s',
            content_item.content_type,
        )
        return False

    try:
        mapper(content_item, payload, request_country=request_country)
    except Exception:
        logger.exception(
            'ensure_content_detail: mapper failed for content_item=%s', content_item.id,
        )
        return False

    # Keep BrowseMetadata in sync from the same payload.
    try:
        from content.services.browse_metadata_service import upsert_browse_metadata
        upsert_browse_metadata(content_item, payload)
    except Exception:
        logger.warning(
            'ensure_content_detail: browse_meta refresh failed for content_item=%s',
            content_item.id,
            exc_info=True,
        )

    return True


__all__ = [
    'MAPPERS',
    'get_or_create_content_item',
    'detail_for',
    'detail_is_complete',
    'detail_is_fresh',
    'ensure_content_detail',
]
