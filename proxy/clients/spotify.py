from typing import Dict, Any, Tuple, Optional
from django.conf import settings
import requests
import base64
from time import time
from .base import BaseAPIClient
from proxy.errors import build_error_response, get_http_status, UNAUTHORIZED
from concurrent.futures import ThreadPoolExecutor

class SpotifyClient(BaseAPIClient):
    _access_token: Optional[str] = None
    _token_expires_at: Optional[float] = None

    def __init__(self):
        config = settings.PROXY_API['SPOTIFY']
        super().__init__(base_url=config['BASE_URL'])

        self.client_id = config['CLIENT_ID']
        self.client_secret = config['CLIENT_SECRET']
        self.auth_url = config['AUTH_URL']
        self.access_token = self._get_or_refresh_token()

    def _is_token_valid(self) -> bool:
        if not SpotifyClient._access_token or not SpotifyClient._token_expires_at: return False

        buffer_time = settings.PROXY_API['SPOTIFY']['TOKEN_BUFFER_TIME']
        return time() < (SpotifyClient._token_expires_at - buffer_time)

    def _fetch_new_token(self) -> str:
        credentials = f"{self.client_id}:{self.client_secret}"
        encoded_credentials = base64.b64encode(credentials.encode()).decode()

        headers = {
            'Authorization': f'Basic {encoded_credentials}',
            'Content-Type': 'application/x-www-form-urlencoded'
        }

        data = {'grant_type': 'client_credentials'}

        try:
            response = requests.post(self.auth_url, headers=headers, data=data, timeout=self.timeout)
            response.raise_for_status()
            token_data = response.json()

            SpotifyClient._access_token = token_data['access_token']
            SpotifyClient._token_expires_at = time() + token_data['expires_in']

            return SpotifyClient._access_token
        except Exception:
            return ''

    def _get_or_refresh_token(self) -> str:
        if self._is_token_valid(): return SpotifyClient._access_token
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
        return self.get(endpoint, params=params)

    def get_album(self, album_id: str) -> Tuple[Dict[str, Any], int]:
        endpoint = f'albums/{album_id}'
        return self.get(endpoint)

    def get_bulk_albums(self, album_ids: list[str]) -> Tuple[Dict[str, Any], int]:
        if not album_ids: return {'albums': []}, 200

        # Spotify has a limit of 20 albums per request
        # Split into batches of 20 for parallel processing
        batch_size = 20
        if len(album_ids) <= batch_size:
            endpoint = 'albums'
            params = {'ids': ','.join(album_ids)}
            return self.get(endpoint, params=params)

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
        return self.get(endpoint, params=params)

    def get_featured_playlists(self, limit: int = 20, offset: int = 0) -> Tuple[Dict[str, Any], int]:
        endpoint = 'browse/featured-playlists'
        params = {
            'limit': limit,
            'offset': offset
        }
        return self.get(endpoint, params=params)
