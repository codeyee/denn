from typing import Optional, Dict, Any, List
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed

from content.models import ContentItem

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


def bulk_fetch_source_data(
    content_items: list,
    country_code: Optional[str] = None,
) -> Dict[int, Dict[str, Any]]:
    """
    Fetch source data for multiple ContentItems using the Go proxy API bulk endpoints.

    Groups items by source_api and uses bulk endpoints where possible.
    Seasons are fetched individually (no bulk endpoint).

    Args:
        content_items: List of ContentItem instances to fetch data for
        country_code: Optional ISO 3166-1 alpha-2 country code

    Returns:
        Dict mapping content_item.id (int) to source_data (dict)
    """
    if not content_items:
        return {}

    results: Dict[int, Optional[Dict[str, Any]]] = {}
    grouped: Dict[str, List[ContentItem]] = defaultdict(list)
    for item in content_items:
        grouped[item.source_api].append(item)

    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = []

        if ContentItem.SourceAPI.TMDB in grouped:
            futures.append(executor.submit(_bulk_fetch_tmdb, grouped[ContentItem.SourceAPI.TMDB], country_code))

        if ContentItem.SourceAPI.IGDB in grouped:
            futures.append(executor.submit(_bulk_fetch_igdb, grouped[ContentItem.SourceAPI.IGDB]))

        if ContentItem.SourceAPI.SPOTIFY in grouped:
            futures.append(executor.submit(_bulk_fetch_spotify, grouped[ContentItem.SourceAPI.SPOTIFY]))

        if ContentItem.SourceAPI.OPENLIBRARY in grouped:
            futures.append(executor.submit(_bulk_fetch_openlibrary, grouped[ContentItem.SourceAPI.OPENLIBRARY]))

        for future in as_completed(futures):
            try:
                partial_results = future.result()
                results.update(partial_results)
            except Exception:
                pass

    return results


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
        with ThreadPoolExecutor(max_workers=10) as executor:
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
