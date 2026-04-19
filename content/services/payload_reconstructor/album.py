"""Reconstruct an album payload from AlbumDetail + Track rows."""
from __future__ import annotations

from typing import Any, Dict, Optional

from content.models import ContentItem

from ._common import (
    serialize_authors,
    serialize_images,
    serialize_release_date,
)


def from_local(content_item: ContentItem, *, request_country: Optional[str] = None) -> Optional[Dict[str, Any]]:
    detail = getattr(content_item, 'album_detail', None)
    if detail is None:
        try:
            from content.models import AlbumDetail
            detail = AlbumDetail.objects.get(content_item=content_item)
        except Exception:
            return None

    payload: Dict[str, Any] = {
        'id': content_item.external_id,
        'type': 'album',
        'title': detail.title,
    }

    if detail.image_url:
        payload['image_url'] = detail.image_url
    rd = serialize_release_date(detail.release_date)
    if rd:
        payload['release_date'] = rd
    if detail.total_tracks is not None:
        payload['total_tracks'] = detail.total_tracks
    if detail.duration_minutes is not None:
        payload['duration_minutes'] = detail.duration_minutes
    if detail.album_type:
        payload['album_type'] = detail.album_type
    if detail.external_url:
        payload['external_url'] = detail.external_url

    authors = serialize_authors(content_item)
    if authors:
        payload['authors'] = authors

    images = serialize_images(content_item.images.all())
    if images:
        payload['images'] = images

    tracks_qs = detail.tracks.all()
    tracks_out = []
    for tr in tracks_qs:
        tr_payload: Dict[str, Any] = {
            'id': tr.track_id_external,
            'track_number': tr.track_number,
        }
        if tr.title:
            tr_payload['title'] = tr.title
        if tr.duration_seconds is not None:
            tr_payload['duration_seconds'] = tr.duration_seconds
        if tr.external_url:
            tr_payload['external_url'] = tr.external_url
        ta = list(tr.track_authors.all())
        if ta:
            tr_payload['authors'] = [{'name': a.author.name, 'type': a.role} for a in ta]
        tracks_out.append(tr_payload)
    if tracks_out:
        payload['tracks'] = tracks_out

    return payload
