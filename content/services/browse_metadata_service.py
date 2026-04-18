"""
Browse metadata service (Sprint 4.5B).

Maps the JSON payloads returned by the Go proxy (`source_data`) into the
flat columns of `ContentItemBrowseMetadata` so the database can sort,
filter and group items without parsing the JSON at request time.

The proxy normalizes every upstream API into a single shape regardless
of the source. All content types share these top-level keys when
present:

    {
        "id": "<external id>",
        "type": "movie" | "tv_show" | "season" | "album" | "game" | "book",
        "title": "<display title>",
        "release_date": "<YYYY-MM-DD or YYYY-MM or YYYY>",
        "authors": [{"name": "...", "type": "artist|producer|developer|author|..."}],
        ...type-specific fields (description, image_url, platforms, tracks, episodes, ...)
    }

We persist only the fields needed to query the list from SQL
(`display_title`, `artist`, `album_title`, `release_date`); everything
else stays in `source_data` so we don't rebuild a parallel schema.

----------------------------------------------------------------------------
Future work: rehydration system
----------------------------------------------------------------------------
This module exposes `is_stale()` and `refresh_if_stale()` as a placeholder
for the upcoming rehydration job. A future sprint should:

  1. Add a periodic worker (cron / celery beat / management command) that
     iterates ContentItemBrowseMetadata where `last_refreshed_at` is older
     than `BROWSE_METADATA_TTL`.
  2. Re-fetch from the proxy in bulk and call `upsert_browse_metadata` to
     update the row only when the payload hash changed.
  3. Track failure modes (proxy 404, removed items, schema drift) and
     emit metrics.

For now the upsert path runs opportunistically whenever
`bulk_fetch_source_data` brings back fresh data inside the request lifecycle.
"""
from __future__ import annotations

import hashlib
import json
import logging
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from typing import Any, Dict, Iterable, List, Optional

from django.utils import timezone

from content.models import ContentItem, ContentItemBrowseMetadata


logger = logging.getLogger(__name__)


BROWSE_METADATA_TTL = timedelta(days=30)


@dataclass
class BrowseFields:
    display_title: str = ''
    artist: str = ''
    album_title: str = ''
    release_date: Optional[date] = None

    def as_dict(self) -> Dict[str, Any]:
        return {
            'display_title': self.display_title,
            'artist': self.artist,
            'album_title': self.album_title,
            'release_date': self.release_date,
        }


# ---------------------------------------------------------------------------
# Mappers per content type
# ---------------------------------------------------------------------------

def _parse_iso_date(value: Any) -> Optional[date]:
    """Parse `YYYY-MM-DD`, `YYYY-MM`, or `YYYY` strings into a `date`."""
    if not value or not isinstance(value, str):
        return None
    for fmt in ('%Y-%m-%d', '%Y-%m', '%Y'):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def _normalized_title(payload: Dict[str, Any]) -> str:
    """Return the proxy's normalized display title.

    Falls back to `original_title` for movies/tv shows and `tv_show_name`
    for seasons (so `S01` of "Demon Slayer" still sorts under the show).
    """
    return (
        payload.get('title')
        or payload.get('original_title')
        or payload.get('tv_show_name')
        or ''
    ).strip()


def _authors_of_type(payload: Dict[str, Any], wanted: str) -> List[str]:
    out: List[str] = []
    raw = payload.get('authors')
    if not isinstance(raw, list):
        return out
    for entry in raw:
        if isinstance(entry, dict) and entry.get('type') == wanted and entry.get('name'):
            out.append(str(entry['name']))
        elif isinstance(entry, str):
            out.append(entry)
    return out


def _map_movie(payload: Dict[str, Any]) -> BrowseFields:
    return BrowseFields(
        display_title=_normalized_title(payload),
        release_date=_parse_iso_date(payload.get('release_date')),
    )


def _map_tv_show(payload: Dict[str, Any]) -> BrowseFields:
    return BrowseFields(
        display_title=_normalized_title(payload),
        release_date=_parse_iso_date(payload.get('release_date')),
    )


def _map_season(payload: Dict[str, Any]) -> BrowseFields:
    return BrowseFields(
        display_title=_normalized_title(payload),
        release_date=_parse_iso_date(payload.get('release_date')),
    )


def _map_album(payload: Dict[str, Any]) -> BrowseFields:
    title = _normalized_title(payload)
    artists = _authors_of_type(payload, 'artist')
    return BrowseFields(
        display_title=title,
        artist=', '.join(artists),
        album_title=title,
        release_date=_parse_iso_date(payload.get('release_date')),
    )


def _map_game(payload: Dict[str, Any]) -> BrowseFields:
    return BrowseFields(
        display_title=_normalized_title(payload),
        release_date=_parse_iso_date(payload.get('release_date')),
    )


def _map_book(payload: Dict[str, Any]) -> BrowseFields:
    return BrowseFields(
        display_title=_normalized_title(payload),
        release_date=_parse_iso_date(payload.get('release_date')),
    )


_MAPPERS = {
    ContentItem.ContentType.MOVIE: _map_movie,
    ContentItem.ContentType.TV_SHOW: _map_tv_show,
    ContentItem.ContentType.SEASON: _map_season,
    ContentItem.ContentType.ALBUM: _map_album,
    ContentItem.ContentType.GAME: _map_game,
    ContentItem.ContentType.BOOK: _map_book,
}


def build_browse_metadata(content_item: ContentItem, source_data: Dict[str, Any]) -> Optional[BrowseFields]:
    """Return a `BrowseFields` for the given content item, or `None` if there is nothing useful to persist."""
    if not source_data or not isinstance(source_data, dict):
        return None
    mapper = _MAPPERS.get(content_item.content_type)
    if not mapper:
        return None
    fields = mapper(source_data)
    if not fields.display_title and not fields.release_date and not fields.artist:
        return None
    return fields


def _hash_payload(source_data: Dict[str, Any]) -> str:
    try:
        canonical = json.dumps(source_data, sort_keys=True, default=str)
    except Exception:
        return ''
    return hashlib.sha256(canonical.encode('utf-8')).hexdigest()


def upsert_browse_metadata(content_item: ContentItem, source_data: Dict[str, Any]) -> Optional[ContentItemBrowseMetadata]:
    """
    Create or update the `ContentItemBrowseMetadata` row for this content item.

    Best-effort: returns `None` and swallows exceptions if anything goes wrong,
    so the caller (e.g. an HTTP request) is never blocked by a metadata bug.
    """
    try:
        fields = build_browse_metadata(content_item, source_data)
        if not fields:
            return None
        payload_hash = _hash_payload(source_data)
        defaults = fields.as_dict()
        defaults['source_payload_hash'] = payload_hash
        meta, _ = ContentItemBrowseMetadata.objects.update_or_create(
            content_item=content_item,
            defaults=defaults,
        )
        return meta
    except Exception:
        logger.warning(
            'Failed to upsert browse metadata for content_item %s', content_item.id,
            exc_info=True,
        )
        return None


def upsert_many(items: Iterable[ContentItem], source_data_by_id: Dict[int, Optional[Dict[str, Any]]]) -> int:
    """Upsert metadata for many items at once. Returns the number of rows written."""
    written = 0
    for item in items:
        payload = source_data_by_id.get(item.id)
        if payload and upsert_browse_metadata(item, payload):
            written += 1
    return written


# ---------------------------------------------------------------------------
# Rehydration stubs (follow-up sprint owns the worker)
# ---------------------------------------------------------------------------

def is_stale(meta: ContentItemBrowseMetadata, ttl: timedelta = BROWSE_METADATA_TTL) -> bool:
    if not meta.last_refreshed_at:
        return True
    return (timezone.now() - meta.last_refreshed_at) > ttl


def refresh_if_stale(content_item: ContentItem, ttl: timedelta = BROWSE_METADATA_TTL) -> Optional[ContentItemBrowseMetadata]:
    """
    Refresh a single content item if its browse metadata is stale or missing.

    Synchronous fetch via the proxy. Intended only for one-off scripts and
    the management command; production rehydration must batch/parallelize.
    """
    meta = ContentItemBrowseMetadata.objects.filter(content_item=content_item).first()
    if meta and not is_stale(meta, ttl):
        return meta

    # Local import to avoid circular dependency through content.utils.
    from content.utils import fetch_source_data

    payload = fetch_source_data(content_item)
    if not payload:
        return meta
    return upsert_browse_metadata(content_item, payload)
