"""Reconstruct a movie payload from MovieDetail + child rows."""
from __future__ import annotations

from typing import Any, Dict, Optional

from content.models import ContentItem

from ._common import (
    serialize_authors,
    serialize_images,
    serialize_release_date,
    serialize_streaming_platforms,
)


def from_local(content_item: ContentItem, *, request_country: Optional[str] = None) -> Optional[Dict[str, Any]]:
    detail = getattr(content_item, 'movie_detail', None)
    if detail is None:
        try:
            from content.models import MovieDetail
            detail = MovieDetail.objects.get(content_item=content_item)
        except Exception:
            return None

    payload: Dict[str, Any] = {
        'id': content_item.external_id,
        'type': 'movie',
        'title': detail.title,
        'original_title': detail.original_title,
    }

    if detail.imdb_id:
        payload['imdb_id'] = detail.imdb_id
    if detail.tagline:
        payload['tagline'] = detail.tagline
    if detail.description:
        payload['description'] = detail.description
    if detail.image_url:
        payload['image_url'] = detail.image_url
    rd = serialize_release_date(detail.release_date)
    if rd:
        payload['release_date'] = rd
    if detail.status:
        payload['status'] = detail.status
    if detail.duration_minutes is not None:
        payload['duration_minutes'] = detail.duration_minutes

    authors = serialize_authors(content_item)
    if authors:
        payload['authors'] = authors

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
