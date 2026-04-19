"""Reconstruct a proxy-shaped normalized payload from local Detail rows.

Each per-type module exposes `from_local(content_item) -> Optional[dict]`.
The dispatch entry `from_local` here picks the right one based on
`content_item.content_type` and is the only public symbol.

Output dicts are intended to be byte-equivalent to the JSON the proxy
would have returned for the same item, so consumers (the orchestrator,
serializers, the frontend) cannot tell whether the data came from the
local DB or the proxy.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from content.models import ContentItem

from . import album, book, game, movie, season, tv_show


_DISPATCH = {
    ContentItem.ContentType.MOVIE: movie.from_local,
    ContentItem.ContentType.TV_SHOW: tv_show.from_local,
    ContentItem.ContentType.SEASON: season.from_local,
    ContentItem.ContentType.ALBUM: album.from_local,
    ContentItem.ContentType.GAME: game.from_local,
    ContentItem.ContentType.BOOK: book.from_local,
}


def from_local(content_item: ContentItem) -> Optional[Dict[str, Any]]:
    fn = _DISPATCH.get(content_item.content_type)
    if not fn:
        return None
    return fn(content_item)


__all__ = ['from_local', 'movie', 'tv_show', 'season', 'album', 'game', 'book']
