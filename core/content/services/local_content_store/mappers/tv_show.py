"""Map a normalized tv_show payload onto TvShowDetail + child tables."""
from __future__ import annotations

from typing import Any, Dict, Optional

from django.db import transaction

from content.models import ContentItem, TvShowDetail
from content.services.payload_helpers import hash_payload, parse_iso_date

from ._common import (
    replace_content_item_authors,
    replace_images,
    replace_streaming_platforms,
    require_payload_shape,
)


_MAPPED_KEYS = (
    'id', 'type', 'imdb_id', 'title', 'original_title', 'tagline',
    'description', 'image_url', 'release_date', 'status',
    'number_of_seasons', 'number_of_episodes',
    'authors', 'images', 'platforms',
)


def upsert(
    content_item: ContentItem,
    payload: Dict[str, Any],
    *,
    request_country: Optional[str] = None,
) -> None:
    require_payload_shape(payload, expected_type='tv_show')

    subset = {k: payload.get(k) for k in _MAPPED_KEYS if k in payload}
    payload_hash = hash_payload(subset)

    defaults = {
        'title': payload.get('title') or '',
        'original_title': payload.get('original_title') or '',
        'tagline': payload.get('tagline') or '',
        'description': payload.get('description') or '',
        'image_url': payload.get('image_url') or '',
        'release_date': parse_iso_date(payload.get('release_date')),
        'status': payload.get('status') or '',
        'number_of_seasons': payload.get('number_of_seasons'),
        'number_of_episodes': payload.get('number_of_episodes'),
        'imdb_id': payload.get('imdb_id') or '',
        'source_payload_hash': payload_hash,
    }

    with transaction.atomic():
        TvShowDetail.objects.update_or_create(
            content_item=content_item,
            defaults=defaults,
        )
        replace_content_item_authors(content_item, payload)
        replace_images(content_item, payload)
        replace_streaming_platforms(content_item, payload, request_country=request_country)
