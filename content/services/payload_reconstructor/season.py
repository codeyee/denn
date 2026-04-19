"""Reconstruct a season payload from SeasonDetail + Episode rows."""
from __future__ import annotations

from typing import Any, Dict, Optional

from content.models import ContentItem

from ._common import (
    serialize_images,
    serialize_release_date,
    serialize_streaming_platforms,
)


def from_local(content_item: ContentItem, *, request_country: Optional[str] = None) -> Optional[Dict[str, Any]]:
    detail = getattr(content_item, 'season_detail', None)
    if detail is None:
        try:
            from content.models import SeasonDetail
            detail = SeasonDetail.objects.get(content_item=content_item)
        except Exception:
            return None

    payload: Dict[str, Any] = {
        'id': content_item.external_id,
        'type': 'season',
        'season_number': detail.season_number,
    }
    if detail.title:
        payload['title'] = detail.title
    if detail.tv_show_name:
        payload['tv_show_name'] = detail.tv_show_name
    if detail.description:
        payload['description'] = detail.description
    if detail.image_url:
        payload['image_url'] = detail.image_url
    rd = serialize_release_date(detail.release_date)
    if rd:
        payload['release_date'] = rd
    payload['number_of_episodes'] = detail.number_of_episodes

    episodes_qs = detail.episodes.all()
    episodes_out = []
    for ep in episodes_qs:
        ep_payload: Dict[str, Any] = {
            'id': ep.episode_id_external,
            'episode_number': ep.episode_number,
            'season_number': ep.season_number,
        }
        if ep.title:
            ep_payload['title'] = ep.title
        if ep.description:
            ep_payload['description'] = ep.description
        ep_rd = serialize_release_date(ep.release_date)
        if ep_rd:
            ep_payload['release_date'] = ep_rd
        if ep.duration_minutes is not None:
            ep_payload['duration_minutes'] = ep.duration_minutes
        if ep.image_url:
            ep_payload['image_url'] = ep.image_url
        if ep.episode_type:
            ep_payload['episode_type'] = ep.episode_type
        episodes_out.append(ep_payload)
    if episodes_out:
        payload['episodes'] = episodes_out

    images = serialize_images(content_item.images.all())
    if images:
        payload['images'] = images

    platforms = serialize_streaming_platforms(
        content_item.streaming_platforms.all(),
        request_country=request_country,
    )
    if platforms:
        payload['platforms'] = platforms

    return payload
