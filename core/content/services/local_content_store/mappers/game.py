"""Map a normalized game payload onto GameDetail + GamePlatform + taxonomies."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from django.db import transaction
from django.utils.dateparse import parse_datetime

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
    'duration',
)

_MAX_DURATION_RETRIES = 3


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
    duration = payload.get('duration') or {}
    if not isinstance(duration, dict):
        duration = {}

    source_updated_at = duration.get('source_updated_at')
    if isinstance(source_updated_at, str):
        source_updated_at = parse_datetime(source_updated_at)
    else:
        source_updated_at = None

    duration_values = {
        'main_story_seconds': duration.get('main_story_seconds'),
        'main_extra_seconds': duration.get('main_extra_seconds'),
        'completionist_seconds': duration.get('completionist_seconds'),
    }
    duration_status = duration.get('status') or (
        'matched' if any(value is not None and value > 0 for value in duration_values.values()) else 'no_data'
    )

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

        if duration or isinstance(payload.get('play_time'), dict):
            from content.models import GameDurationEstimate

            estimate = GameDurationEstimate.objects.filter(
                content_item=content_item,
                provider=GameDurationEstimate.Provider.IGDB,
            ).first()
            is_error = duration_status == GameDurationEstimate.Status.ERROR
            retry_count = (
                min((estimate.retry_count if estimate else 0) + 1, _MAX_DURATION_RETRIES)
                if is_error
                else 0
            )
            GameDurationEstimate.objects.update_or_create(
                content_item=content_item,
                provider=GameDurationEstimate.Provider.IGDB,
                defaults={
                    'provider_external_id': str(payload.get('id') or content_item.external_id),
                    **duration_values,
                    'source_updated_at': source_updated_at,
                    'status': duration_status,
                    'sample_count': duration.get('sample_count') or 0,
                    'retry_count': retry_count,
                    'payload_hash': hash_payload(duration),
                    'last_error_code': 'igdb_time_to_beats_failed' if is_error else '',
                },
            )
