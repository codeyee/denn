"""Map a normalized season payload onto SeasonDetail + Episode rows."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from django.db import transaction

from content.models import ContentItem, Episode, SeasonDetail
from content.services.payload_helpers import hash_payload, parse_iso_date

from ._common import (
    replace_images,
    replace_streaming_platforms,
    require_payload_shape,
)


_MAPPED_KEYS = (
    'id', 'type', 'season_number', 'tv_show_name', 'title',
    'description', 'image_url', 'release_date',
    'number_of_episodes', 'episodes', 'images', 'platforms',
)


def upsert(
    content_item: ContentItem,
    payload: Dict[str, Any],
    *,
    request_country: Optional[str] = None,
) -> None:
    require_payload_shape(payload, expected_type='season')

    subset = {k: payload.get(k) for k in _MAPPED_KEYS if k in payload}
    payload_hash = hash_payload(subset)

    raw_episodes = payload.get('episodes') or []
    declared_count = payload.get('number_of_episodes')
    if isinstance(raw_episodes, list) and not declared_count:
        declared_count = len(raw_episodes)

    defaults = {
        'season_number': payload.get('season_number') or 0,
        'tv_show_name': payload.get('tv_show_name') or '',
        'title': payload.get('title') or '',
        'description': payload.get('description') or '',
        'image_url': payload.get('image_url') or '',
        'release_date': parse_iso_date(payload.get('release_date')),
        'number_of_episodes': declared_count or 0,
        'source_payload_hash': payload_hash,
    }

    with transaction.atomic():
        season_detail, _ = SeasonDetail.objects.update_or_create(
            content_item=content_item,
            defaults=defaults,
        )

        Episode.objects.filter(season_detail=season_detail).delete()
        rows: List[Episode] = []
        if isinstance(raw_episodes, list):
            for entry in raw_episodes:
                if not isinstance(entry, dict):
                    continue
                external = entry.get('id')
                if not external:
                    continue
                rows.append(
                    Episode(
                        season_detail=season_detail,
                        episode_id_external=str(external),
                        episode_number=entry.get('episode_number') or 0,
                        season_number=entry.get('season_number') or season_detail.season_number,
                        title=entry.get('title') or '',
                        description=entry.get('description') or '',
                        release_date=parse_iso_date(entry.get('release_date')),
                        duration_minutes=entry.get('duration_minutes'),
                        image_url=entry.get('image_url') or '',
                        episode_type=entry.get('episode_type') or '',
                    )
                )
        if rows:
            Episode.objects.bulk_create(rows)

        replace_images(content_item, payload)
        replace_streaming_platforms(content_item, payload, request_country=request_country)
