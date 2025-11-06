from typing import Dict, Any, Optional, Tuple
from django.conf import settings
from .cached import CachedAPIClient
from concurrent.futures import ThreadPoolExecutor

class TMDBClient(CachedAPIClient):
    def __init__(self):
        config = settings.PROXY_API['TMDB']
        super().__init__(base_url=config['BASE_URL'], api_name='tmdb')

        self.api_key = settings.API_KEYS_CACHE['tmdb']['api_key'] or config['API_KEY']
        settings.API_KEYS_CACHE['tmdb']['api_key'] = self.api_key
        self._save_api_keys()

    def get_headers(self) -> Dict[str, str]:
        headers = super().get_default_headers()
        headers['Authorization'] = f'Bearer {self.api_key}'
        return headers

    def search(self, query: str, page: int = 1) -> Tuple[Dict[str, Any], int]:
        endpoint = 'search/multi'
        params = {'query': query, 'page': page}
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_tmdb_search',
            params=params,
            operation='search',
            query=query,
            page=page
        )

    def get_movie_details(self, movie_id: int) -> Tuple[Dict[str, Any], int]:
        endpoint = f'movie/{movie_id}'
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_tmdb_details',
            operation='details',
            movie_id=movie_id
        )

    def get_tv_details(self, tv_id: int) -> Tuple[Dict[str, Any], int]:
        endpoint = f'tv/{tv_id}'
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_tmdb_details',
            operation='details',
            tv_id=tv_id
        )

    def get_season_details(self, tv_id: int, season_number: int) -> Tuple[Dict[str, Any], int]:
        endpoint = f'tv/{tv_id}/season/{season_number}'
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_tmdb_details',
            operation='details',
            tv_id=tv_id,
            season_number=season_number
        )

    def get_bulk_movies(self, movie_ids: list[int]) -> Tuple[list[Dict[str, Any]], int]:
        cache_key = self._generate_cache_key('api_tmdb_bulk', movie_ids=movie_ids)
        cached_response = self._get_cached_response(cache_key)
        if cached_response is not None:
            return cached_response

        results = []

        def fetch_movie(movie_id: int) -> Dict[str, Any]:
            data, status_code = self.get_movie_details(movie_id)
            return {
                'id': movie_id,
                'data': data if status_code == 200 else None,
                'status_code': status_code,
                'error': data if status_code != 200 else None
            }

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(fetch_movie, movie_id) for movie_id in movie_ids]
            results = [future.result() for future in futures]

        cache_timeout = self._get_cache_timeout('api_tmdb_details')
        self._cache_response(cache_key, results, 200, cache_timeout)

        return results, 200

    def get_bulk_tv_shows(self, tv_ids: list[int]) -> Tuple[list[Dict[str, Any]], int]:
        results = []

        def fetch_tv_show(tv_id: int) -> Dict[str, Any]:
            data, status_code = self.get_tv_details(tv_id)
            return {
                'id': tv_id,
                'data': data if status_code == 200 else None,
                'status_code': status_code,
                'error': data if status_code != 200 else None
            }

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(fetch_tv_show, tv_id) for tv_id in tv_ids]
            results = [future.result() for future in futures]

        return results, 200

    def get_bulk_seasons(self, season_requests: list[dict]) -> Tuple[list[Dict[str, Any]], int]:
        results = []

        def fetch_season(request: dict) -> Dict[str, Any]:
            tv_id = request.get('tv_id')
            season_number = request.get('season_number')
            data, status_code = self.get_season_details(tv_id, season_number)
            return {
                'tv_id': tv_id,
                'season_number': season_number,
                'data': data if status_code == 200 else None,
                'status_code': status_code,
                'error': data if status_code != 200 else None
            }

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(fetch_season, request) for request in season_requests]
            results = [future.result() for future in futures]

        return results, 200

    def get_popular_movies(self, page: int = 1) -> Tuple[Dict[str, Any], int]:
        endpoint = 'movie/popular'
        params = {'page': page}
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_tmdb_popular_movies',
            params=params,
            operation='search',
            page=page
        )

    def get_popular_tv(self, page: int = 1) -> Tuple[Dict[str, Any], int]:
        endpoint = 'tv/popular'
        params = {'page': page}
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_tmdb_popular_tv',
            params=params,
            operation='search',
            page=page
        )

    def get_movie_external_ids(self, movie_id: int) -> Tuple[Dict[str, Any], int]:
        endpoint = f'movie/{movie_id}/external_ids'
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_tmdb_external_ids',
            operation='details',
            movie_id=movie_id
        )

    def get_movie_watch_providers(self, movie_id: int) -> Tuple[Dict[str, Any], int]:
        endpoint = f'movie/{movie_id}/watch/providers'
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_tmdb_watch_providers',
            operation='details',
            movie_id=movie_id
        )

    def get_tv_external_ids(self, tv_id: int) -> Tuple[Dict[str, Any], int]:
        endpoint = f'tv/{tv_id}/external_ids'
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_tmdb_external_ids_tv',
            operation='details',
            tv_id=tv_id
        )

    def get_tv_watch_providers(self, tv_id: int) -> Tuple[Dict[str, Any], int]:
        endpoint = f'tv/{tv_id}/watch/providers'
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_tmdb_watch_providers_tv',
            operation='details',
            tv_id=tv_id
        )

    def get_season_external_ids(self, tv_id: int, season_number: int) -> Tuple[Dict[str, Any], int]:
        endpoint = f'tv/{tv_id}/season/{season_number}/external_ids'
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_tmdb_external_ids_season',
            operation='details',
            tv_id=tv_id,
            season_number=season_number
        )

    def get_season_watch_providers(self, tv_id: int, season_number: int) -> Tuple[Dict[str, Any], int]:
        endpoint = f'tv/{tv_id}/season/{season_number}/watch/providers'
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_tmdb_watch_providers_season',
            operation='details',
            tv_id=tv_id,
            season_number=season_number
        )
