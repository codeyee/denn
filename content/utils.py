from typing import Optional, Dict, Any, List, Tuple
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from content.models import ContentItem
from rest_framework import status as http_status

# Lazy-loaded clients and mappers to avoid circular imports
_clients = {}
_mappers = {}


def _get_tmdb_client():
    if 'tmdb' not in _clients:
        from proxy.clients.tmdb import TMDBClient
        _clients['tmdb'] = TMDBClient()
    return _clients['tmdb']


def _get_tmdb_mapper():
    if 'tmdb' not in _mappers:
        from proxy.mappers.tmdb import TMDBMapper
        _mappers['tmdb'] = TMDBMapper(_get_tmdb_client())
    return _mappers['tmdb']


def _get_igdb_client():
    if 'igdb' not in _clients:
        from proxy.clients.igdb import IGDBClient
        _clients['igdb'] = IGDBClient()
    return _clients['igdb']


def _get_igdb_mapper():
    if 'igdb' not in _mappers:
        from proxy.mappers.igdb import IGDBMapper
        _mappers['igdb'] = IGDBMapper(_get_igdb_client())
    return _mappers['igdb']


def _get_spotify_client():
    if 'spotify' not in _clients:
        from proxy.clients.spotify import SpotifyClient
        _clients['spotify'] = SpotifyClient()
    return _clients['spotify']


def _get_spotify_mapper():
    if 'spotify' not in _mappers:
        from proxy.mappers.spotify import SpotifyMapper
        _mappers['spotify'] = SpotifyMapper(_get_spotify_client())
    return _mappers['spotify']


def _get_openlibrary_client():
    if 'openlibrary' not in _clients:
        from proxy.clients.openlibrary import OpenLibraryClient
        _clients['openlibrary'] = OpenLibraryClient()
    return _clients['openlibrary']


def _get_openlibrary_mapper():
    if 'openlibrary' not in _mappers:
        from proxy.mappers.openlibrary import OpenLibraryMapper
        _mappers['openlibrary'] = OpenLibraryMapper(_get_openlibrary_client())
    return _mappers['openlibrary']


def fetch_source_data(content_item: ContentItem, country_code: Optional[str] = None, images_size: Optional[int] = None) -> Optional[Dict[str, Any]]:
    """
    Fetch source data for a single ContentItem.
    Uses direct client/mapper calls instead of DRF views for efficiency.
    """
    source_api = content_item.source_api
    external_id = content_item.external_id
    content_type = content_item.content_type
    _images_size = images_size if images_size is not None else 18

    try:
        if source_api == ContentItem.SourceAPI.TMDB:
            return _fetch_tmdb_data_direct(external_id, content_type, country_code, _images_size)

        elif source_api == ContentItem.SourceAPI.IGDB:
            return _fetch_igdb_data_direct(external_id, _images_size)

        elif source_api == ContentItem.SourceAPI.SPOTIFY:
            return _fetch_spotify_data_direct(external_id, _images_size)

        elif source_api == ContentItem.SourceAPI.OPENLIBRARY:
            return _fetch_openlibrary_data_direct(external_id, _images_size)
    except Exception:
        return None

    return None


def _fetch_tmdb_data_direct(external_id: str, content_type: str, country_code: Optional[str], images_size: int) -> Optional[Dict[str, Any]]:
    """Fetch TMDB data using direct client/mapper calls."""
    try:
        mapper = _get_tmdb_mapper()

        if content_type == ContentItem.ContentType.MOVIE:
            movie, status = mapper.get_movie_complete(int(external_id), country=country_code)
            if status == http_status.HTTP_200_OK and movie:
                return movie.to_dict(images_size=images_size)

        elif content_type == ContentItem.ContentType.TV_SHOW:
            tv_show, status = mapper.get_tv_show_complete(int(external_id), country=country_code)
            if status == http_status.HTTP_200_OK and tv_show:
                return tv_show.to_dict(images_size=images_size)

        elif content_type == ContentItem.ContentType.SEASON:
            parts = external_id.split(':')
            if len(parts) == 2:
                tv_id, season_number = int(parts[0]), int(parts[1])
                season, status = mapper.get_season_complete(tv_id, season_number, country=country_code)
                if status == http_status.HTTP_200_OK and season:
                    return season.to_dict(images_size=images_size)
    except Exception:
        pass

    return None


def _fetch_igdb_data_direct(external_id: str, images_size: int) -> Optional[Dict[str, Any]]:
    """Fetch IGDB data using direct client/mapper calls."""
    try:
        client = _get_igdb_client()
        mapper = _get_igdb_mapper()

        data, status_code = client.get_game(int(external_id))
        if status_code == http_status.HTTP_200_OK and data:
            game = mapper.map_detail(data)
            return game.to_dict(images_size=images_size)
    except Exception:
        pass

    return None


def _fetch_spotify_data_direct(external_id: str, images_size: int) -> Optional[Dict[str, Any]]:
    """Fetch Spotify data using direct client/mapper calls."""
    try:
        client = _get_spotify_client()
        mapper = _get_spotify_mapper()

        data, status_code = client.get_album(external_id)
        if status_code == http_status.HTTP_200_OK and data:
            album = mapper.map_detail(data)
            return album.to_dict(images_size=images_size)
    except Exception:
        pass

    return None


def _fetch_openlibrary_data_direct(external_id: str, images_size: int) -> Optional[Dict[str, Any]]:
    """Fetch OpenLibrary data using direct client/mapper calls."""
    try:
        client = _get_openlibrary_client()
        mapper = _get_openlibrary_mapper()

        data, status_code = client.get_book_by_key(external_id)
        if status_code == http_status.HTTP_200_OK and data:
            book = mapper.map_detail(data)
            return book.to_dict(images_size=images_size)
    except Exception:
        pass

    return None


def bulk_fetch_source_data(
    content_items: list,
    country_code: Optional[str] = None,
    images_size: Optional[int] = None
) -> Dict[int, Dict[str, Any]]:
    """
    Fetch source data for multiple ContentItems using optimized bulk operations.

    PERFORMANCE OPTIMIZATIONS:
    1. Groups items by source_api to use bulk API endpoints where available
    2. Uses direct client/mapper calls instead of DRF View objects (eliminates overhead)
    3. Parallel fetching with ThreadPoolExecutor for remaining items
    4. Leverages caching at the client level

    Performance impact:
        Old approach: 312 items × (View + Factory + Request creation) = massive CPU overhead
        New approach: Bulk API calls + minimal object creation = ~10x less CPU usage

    Args:
        content_items: List of ContentItem instances to fetch data for
        country_code: Optional ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB')
        images_size: Optional limit on number of images to return

    Returns:
        Dict mapping content_item.id (int) to source_data (dict)
    """
    if not content_items:
        return {}

    _images_size = images_size if images_size is not None else 18
    results: Dict[int, Optional[Dict[str, Any]]] = {}

    # Group items by source_api for bulk operations
    grouped: Dict[str, List[ContentItem]] = defaultdict(list)
    for item in content_items:
        grouped[item.source_api].append(item)

    # Process each source API with bulk operations where possible
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = []

        # TMDB items (movies, tv shows, seasons)
        if ContentItem.SourceAPI.TMDB in grouped:
            futures.append(executor.submit(
                _bulk_fetch_tmdb,
                grouped[ContentItem.SourceAPI.TMDB],
                country_code,
                _images_size
            ))

        # IGDB games - has bulk endpoint
        if ContentItem.SourceAPI.IGDB in grouped:
            futures.append(executor.submit(
                _bulk_fetch_igdb,
                grouped[ContentItem.SourceAPI.IGDB],
                _images_size
            ))

        # Spotify albums - has bulk endpoint
        if ContentItem.SourceAPI.SPOTIFY in grouped:
            futures.append(executor.submit(
                _bulk_fetch_spotify,
                grouped[ContentItem.SourceAPI.SPOTIFY],
                _images_size
            ))

        # OpenLibrary books - has bulk endpoint
        if ContentItem.SourceAPI.OPENLIBRARY in grouped:
            futures.append(executor.submit(
                _bulk_fetch_openlibrary,
                grouped[ContentItem.SourceAPI.OPENLIBRARY],
                _images_size
            ))

        # Collect results from all bulk operations
        for future in as_completed(futures):
            try:
                partial_results = future.result()
                results.update(partial_results)
            except Exception as e:
                print(f"Error in bulk fetch: {e}")

    return results


def _bulk_fetch_tmdb(
    items: List[ContentItem],
    country_code: Optional[str],
    images_size: int
) -> Dict[int, Optional[Dict[str, Any]]]:
    """
    Bulk fetch TMDB data using bulk endpoints where possible.
    Falls back to parallel individual fetches for mixed content types.
    """
    results: Dict[int, Optional[Dict[str, Any]]] = {}

    # Group by content type
    movies = [(item.id, item.external_id) for item in items if item.content_type == ContentItem.ContentType.MOVIE]
    tv_shows = [(item.id, item.external_id) for item in items if item.content_type == ContentItem.ContentType.TV_SHOW]
    seasons = [(item.id, item.external_id) for item in items if item.content_type == ContentItem.ContentType.SEASON]

    client = _get_tmdb_client()
    mapper = _get_tmdb_mapper()

    # Bulk fetch movies
    if movies:
        movie_ids = [int(ext_id) for _, ext_id in movies]
        bulk_results, _ = client.get_bulk_movies(movie_ids)

        # Create a map of external_id -> result
        result_map = {}
        for result in bulk_results:
            if result.get('status_code') == 200 and result.get('data'):
                result_map[result['id']] = result['data']

        # Process each movie
        for item_id, ext_id in movies:
            try:
                movie_data = result_map.get(int(ext_id))
                if movie_data:
                    # Get additional data that append_to_response provides
                    external_ids_data = movie_data.get('external_ids')
                    platforms_data = movie_data.get('watch/providers')
                    images_data = movie_data.get('images')

                    movie = mapper.map_movie(
                        movie_data,
                        external_ids_data,
                        platforms_data,
                        images_data,
                        country_code
                    )
                    results[item_id] = movie.to_dict(images_size=images_size)
                else:
                    results[item_id] = None
            except Exception:
                results[item_id] = None

    # Bulk fetch TV shows
    if tv_shows:
        tv_ids = [int(ext_id) for _, ext_id in tv_shows]
        bulk_results, _ = client.get_bulk_tv_shows(tv_ids)

        result_map = {}
        for result in bulk_results:
            if result.get('status_code') == 200 and result.get('data'):
                result_map[result['id']] = result['data']

        for item_id, ext_id in tv_shows:
            try:
                tv_data = result_map.get(int(ext_id))
                if tv_data:
                    external_ids_data = tv_data.get('external_ids')
                    platforms_data = tv_data.get('watch/providers')
                    images_data = tv_data.get('images')

                    tv_show = mapper.map_tv_show(
                        tv_data,
                        external_ids_data,
                        platforms_data,
                        images_data,
                        country_code
                    )
                    results[item_id] = tv_show.to_dict(images_size=images_size)
                else:
                    results[item_id] = None
            except Exception:
                results[item_id] = None

    # Seasons need individual fetches (complex data requirements)
    if seasons:
        with ThreadPoolExecutor(max_workers=10) as executor:
            season_futures = {}
            for item_id, ext_id in seasons:
                future = executor.submit(
                    _fetch_tmdb_data_direct,
                    ext_id,
                    ContentItem.ContentType.SEASON,
                    country_code,
                    images_size
                )
                season_futures[future] = item_id

            for future in as_completed(season_futures):
                item_id = season_futures[future]
                try:
                    results[item_id] = future.result()
                except Exception:
                    results[item_id] = None

    return results


def _bulk_fetch_igdb(
    items: List[ContentItem],
    images_size: int
) -> Dict[int, Optional[Dict[str, Any]]]:
    """Bulk fetch IGDB games using bulk endpoint."""
    results: Dict[int, Optional[Dict[str, Any]]] = {}

    if not items:
        return results

    client = _get_igdb_client()
    mapper = _get_igdb_mapper()

    # Map item_id to external_id
    id_map = {int(item.external_id): item.id for item in items}
    game_ids = list(id_map.keys())

    try:
        bulk_data, status_code = client.get_bulk_games(game_ids)

        if status_code == http_status.HTTP_200_OK and bulk_data:
            for game_data in bulk_data:
                game_id = game_data.get('id')
                if game_id and game_id in id_map:
                    try:
                        game = mapper.map_detail(game_data)
                        results[id_map[game_id]] = game.to_dict(images_size=images_size)
                    except Exception:
                        results[id_map[game_id]] = None

        # Fill in missing results as None
        for item in items:
            if item.id not in results:
                results[item.id] = None

    except Exception:
        for item in items:
            results[item.id] = None

    return results


def _bulk_fetch_spotify(
    items: List[ContentItem],
    images_size: int
) -> Dict[int, Optional[Dict[str, Any]]]:
    """Bulk fetch Spotify albums using bulk endpoint."""
    results: Dict[int, Optional[Dict[str, Any]]] = {}

    if not items:
        return results

    client = _get_spotify_client()
    mapper = _get_spotify_mapper()

    # Map external_id to item_id
    id_map = {item.external_id: item.id for item in items}
    album_ids = list(id_map.keys())

    try:
        bulk_data, status_code = client.get_bulk_albums(album_ids)

        if status_code == http_status.HTTP_200_OK and bulk_data:
            albums = bulk_data.get('albums', [])
            for album_data in albums:
                if album_data:
                    album_id = album_data.get('id')
                    if album_id and album_id in id_map:
                        try:
                            album = mapper.map_detail(album_data)
                            results[id_map[album_id]] = album.to_dict(images_size=images_size)
                        except Exception:
                            results[id_map[album_id]] = None

        # Fill in missing results as None
        for item in items:
            if item.id not in results:
                results[item.id] = None

    except Exception:
        for item in items:
            results[item.id] = None

    return results


def _bulk_fetch_openlibrary(
    items: List[ContentItem],
    images_size: int
) -> Dict[int, Optional[Dict[str, Any]]]:
    """Bulk fetch OpenLibrary books using bulk endpoint."""
    results: Dict[int, Optional[Dict[str, Any]]] = {}

    if not items:
        return results

    client = _get_openlibrary_client()
    mapper = _get_openlibrary_mapper()

    # Map external_id to item_id
    id_map = {item.external_id: item.id for item in items}
    book_ids = list(id_map.keys())

    try:
        bulk_data, status_code = client.get_bulk_books(book_ids)

        if status_code == http_status.HTTP_200_OK and bulk_data:
            for result in bulk_data:
                book_key = result.get('key')
                book_data = result.get('data')
                if book_key and book_key in id_map and book_data:
                    try:
                        book = mapper.map_detail(book_data)
                        results[id_map[book_key]] = book.to_dict(images_size=images_size)
                    except Exception:
                        results[id_map[book_key]] = None

        # Fill in missing results as None
        for item in items:
            if item.id not in results:
                results[item.id] = None

    except Exception:
        for item in items:
            results[item.id] = None

    return results
