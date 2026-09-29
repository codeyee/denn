"""Map a normalized movie payload onto MovieDetail + child tables."""
from __future__ import annotations

from typing import Any, Dict, Optional

from django.db import transaction

from content.models import ContentItem, MovieDetail
from content.services.payload_helpers import hash_payload, parse_iso_date

from ._common import (
    replace_content_item_authors,
    replace_images,
    replace_streaming_platforms,
    require_payload_shape,
)
from ._safety import (
    MAX_CERTIFICATIONS,
    MAX_GENRES,
    MAX_KEYWORDS,
    clean_certifications,
    clean_optional_bool,
    clean_text_list,
)


_MAPPED_KEYS = (
    'id', 'type', 'imdb_id', 'title', 'original_title', 'tagline',
    'description', 'image_url', 'release_date', 'status',
    'duration_minutes', 'adult', 'genres', 'keywords', 'certifications',
    'authors', 'images', 'platforms',
)


def upsert(
    content_item: ContentItem,
    payload: Dict[str, Any],
    *,
    request_country: Optional[str] = None,
) -> None:
    require_payload_shape(payload, expected_type='movie')

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
        'duration_minutes': payload.get('duration_minutes'),
        'imdb_id': payload.get('imdb_id') or '',
        'adult': clean_optional_bool(payload.get('adult')),
        'genres': clean_text_list(payload.get('genres'), limit=MAX_GENRES),
        'keywords': clean_text_list(payload.get('keywords'), limit=MAX_KEYWORDS),
        'certifications': clean_certifications(
            payload.get('certifications'), limit=MAX_CERTIFICATIONS,
        ),
        'source_payload_hash': payload_hash,
    }

    with transaction.atomic():
        MovieDetail.objects.update_or_create(
            content_item=content_item,
            defaults=defaults,
        )
        replace_content_item_authors(content_item, payload)
        replace_images(content_item, payload)
        replace_streaming_platforms(content_item, payload, request_country=request_country)
