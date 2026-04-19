"""Per-content-type mappers from proxy payload -> local Detail+children rows.

Each mapper exposes a single `upsert(content_item, payload, *, request_country=None)`
function. The MAPPERS dict is dispatched by `ContentItem.content_type`.
"""
from typing import Any, Callable, Dict

from content.models import ContentItem

from . import movie, tv_show, season, album, game, book

MAPPERS: Dict[str, Callable[..., Any]] = {
    ContentItem.ContentType.MOVIE: movie.upsert,
    ContentItem.ContentType.TV_SHOW: tv_show.upsert,
    ContentItem.ContentType.SEASON: season.upsert,
    ContentItem.ContentType.ALBUM: album.upsert,
    ContentItem.ContentType.GAME: game.upsert,
    ContentItem.ContentType.BOOK: book.upsert,
}

__all__ = ['MAPPERS', 'movie', 'tv_show', 'season', 'album', 'game', 'book']
