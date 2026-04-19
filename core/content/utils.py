import os
from typing import Optional, Dict, Any, List
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

from content.models import ContentItem


def _env_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if not raw:
        return default
    try:
        value = int(raw)
        return value if value > 0 else default
    except ValueError:
        return default


# Sprint 08 / T4: TMDB seasons are the only family that fans out to
# individual proxy calls (no bulk endpoint upstream). The default keeps
# the previous hard-coded behaviour; raise it via env to extract more
# concurrency once Sprint 5 confirms the proxy can take it.
TMDB_SEASONS_MAX_WORKERS = _env_int("TMDB_SEASONS_MAX_WORKERS", 10)


_client = None


def _get_proxy_client():
    global _client
    if _client is None:
        from content.services.proxy_client import ProxyAPIClient
        _client = ProxyAPIClient()
    return _client


def fetch_source_data(
    content_item: ContentItem,
    country_code: Optional[str] = None,
) -> Optional[Dict[str, Any]]:
    """
    Fetch source data for a single ContentItem from the Go proxy API.
    """
    client = _get_proxy_client()
    source_api = content_item.source_api
    external_id = content_item.external_id
    content_type = content_item.content_type

    try:
        if source_api == ContentItem.SourceAPI.TMDB:
            if content_type == ContentItem.ContentType.MOVIE:
                return client.get_movie(external_id, country=country_code)
            elif content_type == ContentItem.ContentType.TV_SHOW:
                return client.get_tv_show(external_id, country=country_code)
            elif content_type == ContentItem.ContentType.SEASON:
                parts = external_id.split(":")
                if len(parts) == 2:
                    return client.get_season(parts[0], int(parts[1]), country=country_code)

        elif source_api == ContentItem.SourceAPI.IGDB:
            return client.get_game(external_id)

        elif source_api == ContentItem.SourceAPI.SPOTIFY:
            return client.get_album(external_id)

        elif source_api == ContentItem.SourceAPI.OPENLIBRARY:
            return client.get_book(external_id)

    except Exception:
        return None

    return None


def bulk_fetch_source_data(*_args, **_kwargs):
    """Removed in Sprint 07 / PR-7E.

    Use `content.services.source_data_orchestrator.fetch_bulk_source_data`
    directly. The two functions are not API-compatible — the orchestrator
    is the canonical local-first read path; this shim used to wrap it.
    """
    raise ImportError(
        '410 Gone: content.utils.bulk_fetch_source_data was removed. '
        'Import fetch_bulk_source_data from '
        'content.services.source_data_orchestrator instead.'
    )


def _bulk_fetch_tmdb(
    items: List[ContentItem],
    country_code: Optional[str],
) -> Dict[int, Optional[Dict[str, Any]]]:
    """Bulk fetch TMDB data (movies and tv_shows via bulk, seasons individually)."""
    client = _get_proxy_client()
    results: Dict[int, Optional[Dict[str, Any]]] = {}

    movies = [(item.id, item.external_id) for item in items if item.content_type == ContentItem.ContentType.MOVIE]
    tv_shows = [(item.id, item.external_id) for item in items if item.content_type == ContentItem.ContentType.TV_SHOW]
    seasons = [(item.id, item.external_id) for item in items if item.content_type == ContentItem.ContentType.SEASON]

    if movies:
        movie_ids = [ext_id for _, ext_id in movies]
        id_to_item = {ext_id: item_id for item_id, ext_id in movies}
        bulk_data = client.get_bulk_movies(movie_ids, country=country_code)
        returned_ids = set()
        for movie in bulk_data:
            mid = movie.get("id")
            if mid and str(mid) in id_to_item:
                results[id_to_item[str(mid)]] = movie
                returned_ids.add(str(mid))
        for item_id, ext_id in movies:
            if ext_id not in returned_ids:
                results[item_id] = None

    if tv_shows:
        tv_ids = [ext_id for _, ext_id in tv_shows]
        id_to_item = {ext_id: item_id for item_id, ext_id in tv_shows}
        bulk_data = client.get_bulk_tv_shows(tv_ids, country=country_code)
        returned_ids = set()
        for tv in bulk_data:
            tid = tv.get("id")
            if tid and str(tid) in id_to_item:
                results[id_to_item[str(tid)]] = tv
                returned_ids.add(str(tid))
        for item_id, ext_id in tv_shows:
            if ext_id not in returned_ids:
                results[item_id] = None

    if seasons:
        with ThreadPoolExecutor(max_workers=TMDB_SEASONS_MAX_WORKERS) as executor:
            season_futures = {}
            for item_id, ext_id in seasons:
                parts = ext_id.split(":")
                if len(parts) == 2:
                    future = executor.submit(client.get_season, parts[0], int(parts[1]), country_code)
                    season_futures[future] = item_id
                else:
                    results[item_id] = None

            for future in as_completed(season_futures):
                item_id = season_futures[future]
                try:
                    results[item_id] = future.result()
                except Exception:
                    results[item_id] = None

    return results


def _bulk_fetch_igdb(items: List[ContentItem]) -> Dict[int, Optional[Dict[str, Any]]]:
    """Bulk fetch IGDB games."""
    client = _get_proxy_client()
    results: Dict[int, Optional[Dict[str, Any]]] = {}

    game_ids = [item.external_id for item in items]
    id_to_item = {item.external_id: item.id for item in items}

    bulk_data = client.get_bulk_games(game_ids)
    returned_ids = set()
    for game in bulk_data:
        gid = game.get("id")
        if gid and str(gid) in id_to_item:
            results[id_to_item[str(gid)]] = game
            returned_ids.add(str(gid))

    for item in items:
        if item.id not in results:
            results[item.id] = None

    return results


def _bulk_fetch_spotify(items: List[ContentItem]) -> Dict[int, Optional[Dict[str, Any]]]:
    """Bulk fetch Spotify albums."""
    client = _get_proxy_client()
    results: Dict[int, Optional[Dict[str, Any]]] = {}

    album_ids = [item.external_id for item in items]
    id_to_item = {item.external_id: item.id for item in items}

    bulk_data = client.get_bulk_albums(album_ids)
    returned_ids = set()
    for album in bulk_data:
        aid = album.get("id")
        if aid and aid in id_to_item:
            results[id_to_item[aid]] = album
            returned_ids.add(aid)

    for item in items:
        if item.id not in results:
            results[item.id] = None

    return results


def _bulk_fetch_openlibrary(items: List[ContentItem]) -> Dict[int, Optional[Dict[str, Any]]]:
    """Bulk fetch OpenLibrary books."""
    client = _get_proxy_client()
    results: Dict[int, Optional[Dict[str, Any]]] = {}

    book_ids = [item.external_id for item in items]
    id_to_item = {item.external_id: item.id for item in items}

    bulk_data = client.get_bulk_books(book_ids)
    returned_ids = set()
    for book in bulk_data:
        bid = book.get("id")
        if bid and bid in id_to_item:
            results[id_to_item[bid]] = book
            returned_ids.add(bid)

    for item in items:
        if item.id not in results:
            results[item.id] = None

    return results
