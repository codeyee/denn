"""Map a normalized game payload onto GameDetail + GamePlatform + taxonomies."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from django.db import transaction

from content.models import (
    ContentItem,
    GameDetail,
    GamePlatform,
)
from content.services.payload_helpers import hash_payload, parse_iso_date

from ._common import (
    replace_content_item_authors,
    replace_images,
    require_payload_shape,
    sync_game_taxonomies,
)


_MAPPED_KEYS = (
    'id', 'type', 'title', 'game_type', 'description', 'image_url',
    'release_date', 'series', 'authors', 'platforms', 'genres',
    'themes', 'game_modes', 'play_time', 'images',
)


def upsert(
    content_item: ContentItem,
    payload: Dict[str, Any],
    *,
    request_country: Optional[str] = None,
) -> None:
    require_payload_shape(payload, expected_type='game')

    subset = {k: payload.get(k) for k in _MAPPED_KEYS if k in payload}
    payload_hash = hash_payload(subset)

    play_time = payload.get('play_time') or {}
    play_min = play_time.get('min') if isinstance(play_time, dict) else None
    play_max = play_time.get('max') if isinstance(play_time, dict) else None

    defaults = {
        'title': payload.get('title') or '',
        'game_type': payload.get('game_type') or '',
        'description': payload.get('description') or '',
        'image_url': payload.get('image_url') or '',
        'release_date': parse_iso_date(payload.get('release_date')),
        'series': payload.get('series') or '',
        'play_time_min': play_min,
        'play_time_max': play_max,
        'source_payload_hash': payload_hash,
    }

    raw_platforms = payload.get('platforms')

    with transaction.atomic():
        game_detail, _ = GameDetail.objects.update_or_create(
            content_item=content_item,
            defaults=defaults,
        )
        replace_content_item_authors(content_item, payload)
        replace_images(content_item, payload)
        sync_game_taxonomies(game_detail, payload)

        GamePlatform.objects.filter(game_detail=game_detail).delete()
        rows: List[GamePlatform] = []
        if isinstance(raw_platforms, list):
            seen = set()
            for entry in raw_platforms:
                if not isinstance(entry, dict):
                    continue
                name = entry.get('name')
                if not name or name in seen:
                    continue
                seen.add(name)
                rows.append(
                    GamePlatform(
                        game_detail=game_detail,
                        name=name,
                        image_url=entry.get('image_url') or '',
                    )
                )
        if rows:
            GamePlatform.objects.bulk_create(rows)
