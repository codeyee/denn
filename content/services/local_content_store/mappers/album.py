"""Map a normalized album payload onto AlbumDetail + Track + author rows."""
from __future__ import annotations

from typing import Any, Dict, List, Optional

from django.db import transaction

from content.models import (
    AlbumDetail,
    ContentItem,
    Track,
    TrackAuthor,
)
from content.services.payload_helpers import hash_payload, parse_iso_date

from ._common import (
    _get_or_create_author,
    replace_content_item_authors,
    replace_images,
    require_payload_shape,
)


_MAPPED_KEYS = (
    'id', 'type', 'title', 'image_url', 'release_date', 'total_tracks',
    'duration_minutes', 'album_type', 'external_url', 'authors',
    'images', 'tracks',
)


def _replace_track_authors(track: Track, raw_authors: Any) -> None:
    TrackAuthor.objects.filter(track=track).delete()
    if not isinstance(raw_authors, list):
        return
    seen = set()
    for idx, entry in enumerate(raw_authors):
        if isinstance(entry, dict):
            name = entry.get('name')
            role = entry.get('type') or ''
        elif isinstance(entry, str):
            name = entry
            role = ''
        else:
            continue
        if not name:
            continue
        key = (name, role)
        if key in seen:
            continue
        seen.add(key)
        author = _get_or_create_author(name)
        TrackAuthor.objects.create(track=track, author=author, role=role, position=idx)


def upsert(
    content_item: ContentItem,
    payload: Dict[str, Any],
    *,
    request_country: Optional[str] = None,
) -> None:
    require_payload_shape(payload, expected_type='album')

    subset = {k: payload.get(k) for k in _MAPPED_KEYS if k in payload}
    payload_hash = hash_payload(subset)

    defaults = {
        'title': payload.get('title') or '',
        'album_type': payload.get('album_type') or '',
        'total_tracks': payload.get('total_tracks'),
        'duration_minutes': payload.get('duration_minutes'),
        'image_url': payload.get('image_url') or '',
        'release_date': parse_iso_date(payload.get('release_date')),
        'external_url': payload.get('external_url') or '',
        'source_payload_hash': payload_hash,
    }

    raw_tracks = payload.get('tracks') or []

    with transaction.atomic():
        album_detail, _ = AlbumDetail.objects.update_or_create(
            content_item=content_item,
            defaults=defaults,
        )
        replace_content_item_authors(content_item, payload)
        replace_images(content_item, payload)

        Track.objects.filter(album_detail=album_detail).delete()
        new_tracks: List[Track] = []
        track_authors: List[Any] = []
        if isinstance(raw_tracks, list):
            for entry in raw_tracks:
                if not isinstance(entry, dict):
                    continue
                external = entry.get('id')
                if not external:
                    continue
                track = Track.objects.create(
                    album_detail=album_detail,
                    track_id_external=str(external),
                    track_number=entry.get('track_number') or 0,
                    title=entry.get('title') or '',
                    duration_seconds=entry.get('duration_seconds'),
                    external_url=entry.get('external_url') or '',
                )
                _replace_track_authors(track, entry.get('authors'))
                new_tracks.append(track)
