import os
from typing import Dict, Any, Tuple, Optional
from django.conf import settings
import requests
import base64
from time import time
from .base.cached import CachedAPIClient
from concurrent.futures import ThreadPoolExecutor

SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_AUTH_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_BASE_URL = "https://api.spotify.com/v1"
SPOTIFY_TOKEN_BUFFER_TIME = 60 * 60

class SpotifyClient(CachedAPIClient):
    def __init__(self):
        super().__init__(base_url=SPOTIFY_BASE_URL, api_name='spotify')

        self.client_id = settings.API_KEYS_CACHE['spotify']['client_id'] or SPOTIFY_CLIENT_ID
        self.client_secret = settings.API_KEYS_CACHE['spotify']['client_secret'] or SPOTIFY_CLIENT_SECRET
        self.auth_url = SPOTIFY_AUTH_URL

        settings.API_KEYS_CACHE['spotify']['client_id'] = self.client_id
        settings.API_KEYS_CACHE['spotify']['client_secret'] = self.client_secret
        self._save_api_keys()

        self.access_token = self._get_or_refresh_token()

    def _is_token_valid(self) -> bool:
        access_token = settings.API_KEYS_CACHE['spotify']['access_token']
        token_expires_at = settings.API_KEYS_CACHE['spotify']['token_expires_at']

        if not access_token or not token_expires_at:
            return False

        return time() < (token_expires_at - SPOTIFY_TOKEN_BUFFER_TIME)

    def _fetch_new_token(self) -> str:
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()

        headers = {
            'Authorization': f'Basic {encoded_credentials}',
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        data = {'grant_type': 'client_credentials'}

        try:
            timeout = self._get_timeout('auth')
            response = requests.post(self.auth_url, headers=headers, data=data, timeout=timeout)
            response.raise_for_status()
            token_data = response.json()

            settings.API_KEYS_CACHE['spotify']['access_token'] = token_data['access_token']
            settings.API_KEYS_CACHE['spotify']['token_expires_at'] = time() + token_data['expires_in']
            self._save_api_keys()

            return token_data['access_token']
        except Exception:
            return ''

    def _get_or_refresh_token(self) -> str:
        if self._is_token_valid(): 
            return settings.API_KEYS_CACHE['spotify']['access_token']
        return self._fetch_new_token()

    def get_headers(self) -> Dict[str, str]:
        headers = super().get_default_headers()
        headers['Authorization'] = f'Bearer {self.access_token}'
        return headers

    def search(self, query: str, search_type: str = 'album', limit: int = 20, offset: int = 0) -> Tuple[Dict[str, Any], int]:
        endpoint = 'search'
        params = {
            'q': query,
            'type': search_type,
            'limit': limit,
            'offset': offset
        }
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_spotify_search',
            params=params,
            operation='search',
            query=query,
            search_type=search_type,
            limit=limit,
            offset=offset
        )

    def get_album(self, album_id: str) -> Tuple[Dict[str, Any], int]:
        endpoint = f'albums/{album_id}'
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_spotify_details',
            operation='details',
            album_id=album_id
        )

    def get_bulk_albums(self, album_ids: list[str]) -> Tuple[Dict[str, Any], int]:
        if not album_ids: return {'albums': []}, 200

        cache_key = self._generate_cache_key('api_spotify_bulk', album_ids=album_ids)
        cached_response = self._get_cached_response(cache_key)
        if cached_response is not None:
            return cached_response

        batch_size = 20
        if len(album_ids) <= batch_size:
            endpoint = 'albums'
            params = {'ids': ','.join(album_ids)}
            data, status_code = self.get(endpoint, params=params, operation='bulk')

            if status_code == 200:
                cache_timeout = self._get_cache_timeout('api_spotify_details')
                self._cache_response(cache_key, data, status_code, cache_timeout)

            return data, status_code

        def fetch_albums_batch(batch_ids: list[str]) -> Tuple[list[Dict[str, Any]], int]:
            endpoint = 'albums'
            params = {'ids': ','.join(batch_ids)}
            data, status_code = self.get(endpoint, params=params)
            return data.get('albums', []) if status_code == 200 else [], status_code

        batches = [album_ids[i:i + batch_size] for i in range(0, len(album_ids), batch_size)]
        all_albums = []

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(fetch_albums_batch, batch) for batch in batches]
            for future in futures:
                albums, status_code = future.result()
                if status_code == 200:
                    all_albums.extend(albums)

        return {'albums': all_albums}, 200

    def get_new_releases(self, limit: int = 20, offset: int = 0) -> Tuple[Dict[str, Any], int]:
        endpoint = 'browse/new-releases'
        params = {
            'limit': limit,
            'offset': offset
        }
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_spotify_new_releases',
            params=params,
            operation='search',
            limit=limit,
            offset=offset
        )

    def get_featured_playlists(self, limit: int = 20, offset: int = 0) -> Tuple[Dict[str, Any], int]:
        endpoint = 'browse/featured-playlists'
        params = {
            'limit': limit,
            'offset': offset
        }
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_spotify_new_releases',
            params=params,
            operation='search',
            limit=limit,
            offset=offset
        )
