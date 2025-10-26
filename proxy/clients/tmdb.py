from typing import Dict, Any, Optional, Tuple
from django.conf import settings
from .base import BaseAPIClient

class TMDBClient(BaseAPIClient):
    def __init__(self):
        config = settings.PROXY_API['TMDB']
        super().__init__(base_url=config['BASE_URL'])

        self.api_key = config['API_KEY']

    def get_headers(self) -> Dict[str, str]:
        headers = super().get_default_headers()
        headers['Authorization'] = f'Bearer {self.api_key}'
        return headers

    def search(self, query: str, page: int = 1) -> Tuple[Dict[str, Any], int]:
        endpoint = 'search/multi'
        params = {'query': query, 'page': page}
        return self.get(endpoint, params=params)

    def get_movie_details(self, movie_id: int) -> Tuple[Dict[str, Any], int]:
        endpoint = f'movie/{movie_id}'
        return self.get(endpoint)

    def get_tv_details(self, tv_id: int) -> Tuple[Dict[str, Any], int]:
        endpoint = f'tv/{tv_id}'
        return self.get(endpoint)

    def get_season_details(self, tv_id: int, season_number: int) -> Tuple[Dict[str, Any], int]:
        endpoint = f'tv/{tv_id}/season/{season_number}'
        return self.get(endpoint)