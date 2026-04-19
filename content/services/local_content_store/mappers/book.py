"""Map a normalized book payload onto BookDetail + child rows."""
from __future__ import annotations

from typing import Any, Dict, Optional

from django.db import transaction

from content.models import BookDetail, ContentItem
from content.services.payload_helpers import hash_payload, parse_iso_date

from ._common import (
    replace_content_item_authors,
    replace_images,
    require_payload_shape,
)


_MAPPED_KEYS = (
    'id', 'type', 'title', 'description', 'image_url', 'release_date',
    'pages', 'authors', 'images',
)


def upsert(
    content_item: ContentItem,
    payload: Dict[str, Any],
    *,
    request_country: Optional[str] = None,
) -> None:
    require_payload_shape(payload, expected_type='book')

    subset = {k: payload.get(k) for k in _MAPPED_KEYS if k in payload}
    payload_hash = hash_payload(subset)

    defaults = {
        'title': payload.get('title') or '',
        'description': payload.get('description') or '',
        'pages': payload.get('pages'),
        'image_url': payload.get('image_url') or '',
        'release_date': parse_iso_date(payload.get('release_date')),
        'source_payload_hash': payload_hash,
    }

    with transaction.atomic():
        BookDetail.objects.update_or_create(
            content_item=content_item,
            defaults=defaults,
        )
        replace_content_item_authors(content_item, payload)
        replace_images(content_item, payload)
