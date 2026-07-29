"""Reconstruct a game payload from GameDetail + child rows."""
from __future__ import annotations

from typing import Any, Dict, Optional

from content.models import ContentItem
from content.services.game_duration import (
    normalize_game_duration_values,
    normalized_game_duration_status,
)

from ._common import (
    serialize_authors,
    serialize_images,
    serialize_release_date,
)


def from_local(content_item: ContentItem, *, request_country: Optional[str] = None) -> Optional[Dict[str, Any]]:
    detail = getattr(content_item, 'game_detail', None)
    if detail is None:
        try:
            from content.models import GameDetail
            detail = GameDetail.objects.get(content_item=content_item)
        except Exception:
            return None

    payload: Dict[str, Any] = {
        'id': content_item.external_id,
        'type': 'game',
        'title': detail.title,
    }
    if detail.game_type:
        payload['game_type'] = detail.game_type
    if detail.description:
        payload['description'] = detail.description
    if detail.image_url:
        payload['image_url'] = detail.image_url
    rd = serialize_release_date(detail.release_date)
    if rd:
        payload['release_date'] = rd
    if detail.series:
        payload['series'] = detail.series
    if detail.play_time_min is not None or detail.play_time_max is not None:
        play_time = {}
        if detail.play_time_min is not None:
            play_time['min'] = detail.play_time_min
        if detail.play_time_max is not None:
            play_time['max'] = detail.play_time_max
        payload['play_time'] = play_time

    estimates = content_item.game_duration_estimates.all()
    estimate = estimates.filter(provider='igdb').first()
    if estimate is not None:
        duration_values = normalize_game_duration_values({
            'hastily_seconds': estimate.hastily_seconds,
            'normally_seconds': estimate.normally_seconds,
            'completely_seconds': estimate.completely_seconds,
        })
        duration_status = normalized_game_duration_status(
            estimate.status,
            duration_values,
        )
        duration: Dict[str, Any] = {
            'source': estimate.provider,
            'status': duration_status,
            'updated_at': estimate.synced_at.isoformat() if estimate.synced_at else None,
        }
        for field, value in duration_values.items():
            if value is not None:
                duration[field] = value
        if estimate.sample_count:
            duration['sample_count'] = estimate.sample_count
        payload['duration'] = duration

    authors = serialize_authors(content_item)
    if authors:
        payload['authors'] = authors

    platforms_out = []
    for p in detail.platforms.all():
        entry: Dict[str, Any] = {'name': p.name}
        if p.image_url:
            entry['image_url'] = p.image_url
        platforms_out.append(entry)
    if platforms_out:
        payload['platforms'] = platforms_out

    genres = [g.name for g in detail.genres.all()]
    if genres:
        payload['genres'] = genres
    themes = [t.name for t in detail.themes.all()]
    if themes:
        payload['themes'] = themes
    modes = [m.name for m in detail.game_modes.all()]
    if modes:
        payload['game_modes'] = modes

    images = serialize_images(content_item.images.all())
    if images:
        payload['images'] = images

    return payload
