from typing import Optional, Dict, Any
from content.models import ContentItem
from rest_framework import status as http_status
from rest_framework.test import APIRequestFactory
from rest_framework.request import Request
from proxy.views.movies.detail import MovieDetailView
from proxy.views.tv_shows.detail import TVShowDetailView
from proxy.views.tv_shows.season import TVSeasonDetailView
from proxy.views.games.detail import GameDetailView
from proxy.views.albums.detail import AlbumDetailView
from proxy.views.books.detail import BookDetailView


def fetch_source_data(content_item: ContentItem, country_code: Optional[str] = None, images_size: Optional[int] = None) -> Optional[Dict[str, Any]]:
    source_api = content_item.source_api
    external_id = content_item.external_id
    content_type = content_item.content_type

    try:
        if source_api == ContentItem.SourceAPI.TMDB:
            return _fetch_tmdb_data(external_id, content_type, country_code=country_code, images_size=images_size)

        elif source_api == ContentItem.SourceAPI.IGDB:
            return _fetch_igdb_data(external_id, images_size=images_size)

        elif source_api == ContentItem.SourceAPI.SPOTIFY:
            return _fetch_spotify_data(external_id, images_size=images_size)

        elif source_api == ContentItem.SourceAPI.OPENLIBRARY:
            return _fetch_openlibrary_data(external_id, images_size=images_size)
    except Exception:
        return None

    return None


def _fetch_tmdb_data(external_id: str, content_type: str, country_code: Optional[str] = None, images_size: Optional[int] = None) -> Optional[Dict[str, Any]]:
    try:
        if content_type == ContentItem.ContentType.MOVIE:
            return _fetch_tmdb_movie_data(external_id, country_code, images_size=images_size)

        elif content_type == ContentItem.ContentType.TV_SHOW:
            return _fetch_tmdb_tv_show_data(external_id, country_code, images_size=images_size)

        elif content_type == ContentItem.ContentType.SEASON:
            return _fetch_tmdb_season_data(external_id, country_code, images_size=images_size)

    except Exception:
        pass

    return None


def _fetch_tmdb_movie_data(external_id: str, country_code: Optional[str] = None, images_size: Optional[int] = None) -> Optional[Dict[str, Any]]:
    try:
        view = MovieDetailView()
        factory = APIRequestFactory()
        params = {}
        if country_code:
            params['country'] = country_code
        if images_size is not None:
            params['images_size'] = str(images_size)
            
        factory_request = factory.get(f'/api/proxy/movies/{external_id}/', params)
        request = Request(factory_request)

        response = view.get(request, movie_id=external_id)
        if response.status_code == http_status.HTTP_200_OK:
            return response.data
    except Exception:
        pass

    return None


def _fetch_tmdb_tv_show_data(external_id: str, country_code: Optional[str] = None, images_size: Optional[int] = None) -> Optional[Dict[str, Any]]:
    try:
        view = TVShowDetailView()
        factory = APIRequestFactory()
        params = {}
        if country_code:
            params['country'] = country_code
        if images_size is not None:
            params['images_size'] = str(images_size)

        factory_request = factory.get(f'/api/proxy/tv-shows/{external_id}/', params)
        request = Request(factory_request)

        response = view.get(request, tv_id=external_id)
        if response.status_code == http_status.HTTP_200_OK:
            return response.data
    except Exception:
        pass

    return None


def _fetch_tmdb_season_data(external_id: str, country_code: Optional[str] = None, images_size: Optional[int] = None) -> Optional[Dict[str, Any]]:
    try:
        parts = external_id.split(':')
        if len(parts) == 2:
            tv_id = parts[0]
            season_number = parts[1]

            view = TVSeasonDetailView()
            factory = APIRequestFactory()
            params = {}
            if country_code:
                params['country'] = country_code
            if images_size is not None:
                params['images_size'] = str(images_size)
                
            factory_request = factory.get(f'/api/proxy/tv-shows/{tv_id}/seasons/{season_number}/', params)
            request = Request(factory_request)

            response = view.get(request, tv_id=tv_id, season_number=season_number)
            if response.status_code == http_status.HTTP_200_OK:
                return response.data
    except Exception:
        pass

    return None


def _fetch_igdb_data(external_id: str, images_size: Optional[int] = None) -> Optional[Dict[str, Any]]:
    try:
        view = GameDetailView()
        factory = APIRequestFactory()
        params = {}
        if images_size is not None:
            params['images_size'] = str(images_size)

        factory_request = factory.get(f'/api/proxy/games/{external_id}/', params)
        request = Request(factory_request)

        response = view.get(request, game_id=external_id)
        if response.status_code == http_status.HTTP_200_OK:
            return response.data
    except Exception:
        pass

    return None


def _fetch_spotify_data(external_id: str, images_size: Optional[int] = None) -> Optional[Dict[str, Any]]:
    try:
        view = AlbumDetailView()
        factory = APIRequestFactory()
        params = {}
        if images_size is not None:
            params['images_size'] = str(images_size)

        factory_request = factory.get(f'/api/proxy/albums/{external_id}/', params)
        request = Request(factory_request)

        response = view.get(request, album_id=external_id)
        if response.status_code == http_status.HTTP_200_OK:
            return response.data
    except Exception:
        pass

    return None


def _fetch_openlibrary_data(external_id: str, images_size: Optional[int] = None) -> Optional[Dict[str, Any]]:
    try:
        view = BookDetailView()
        factory = APIRequestFactory()
        params = {}
        if images_size is not None:
            params['images_size'] = str(images_size)

        factory_request = factory.get(f'/api/proxy/books/{external_id}/', params)
        request = Request(factory_request)

        response = view.get(request, book_id=external_id)
        if response.status_code == http_status.HTTP_200_OK:
            return response.data
    except Exception:
        pass

    return None


def bulk_fetch_source_data(
    content_items: list,
    country_code: Optional[str] = None,
    images_size: Optional[int] = None
) -> Dict[int, Dict[str, Any]]:
    """
    Fetch source data for multiple ContentItems in parallel using ThreadPoolExecutor.

    This function significantly improves performance by:
    - Fetching all items concurrently instead of sequentially
    - Using 10 parallel workers to maximize throughput
    - Returning a dict mapping content_item.id -> source_data

    Performance:
        Sequential (before): 20 items × 500ms = 10 seconds
        Parallel (after): 20 items / 10 workers × 500ms = 1 second

    Args:
        content_items: List of ContentItem instances to fetch data for
        country_code: Optional ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB')
        images_size: Optional limit on number of images to return

    Returns:
        Dict mapping content_item.id (int) to source_data (dict)

    Example:
        >>> items = [item1, item2, item3]
        >>> data = bulk_fetch_source_data(items, country_code='US', images_size=10)
        >>> print(data[item1.id])  # {'title': '...', 'cover': {...}, ...}
    """
    from concurrent.futures import ThreadPoolExecutor, as_completed

    if not content_items:
        return {}

    results = {}

    # Fetch all items in parallel with ThreadPoolExecutor
    with ThreadPoolExecutor(max_workers=10) as executor:
        # Submit all fetch tasks
        futures = {}
        for item in content_items:
            future = executor.submit(
                fetch_source_data,
                item,
                country_code=country_code,
                images_size=images_size
            )
            futures[future] = item.id

        # Collect results as they complete
        for future in as_completed(futures):
            item_id = futures[future]
            try:
                data = future.result()
                if data:
                    results[item_id] = data
                else:
                    results[item_id] = None
            except Exception as e:
                # Log error but don't fail entire batch
                print(f"Error fetching source data for item {item_id}: {e}")
                results[item_id] = None

    return results
