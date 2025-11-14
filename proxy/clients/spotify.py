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
        cache_key = self._generate_cache_key('api_spotify_new_releases', limit=limit, offset=offset)
        cached_response = self._get_cached_response(cache_key)
        if cached_response is not None:
            return cached_response

        try:
            # Fetch from charts API
            charts_url = "https://charts-spotify-com-service.spotify.com/public/v0/charts"
            timeout = self._get_timeout('search')
            response = requests.get(charts_url, timeout=timeout)
            response.raise_for_status()
            charts_data = response.json()

            # Extract album entries from charts response
            albums_list = self._parse_chart_albums(charts_data)

            # Apply pagination
            start_idx = offset
            end_idx = offset + limit
            paginated_albums = albums_list[start_idx:end_idx]

            # Format response to match Spotify API structure
            result = {
                'albums': {
                    'items': paginated_albums,
                    'total': len(albums_list),
                    'limit': limit,
                    'offset': offset
                }
            }

            # Cache the result
            cache_timeout = self._get_cache_timeout('api_spotify_new_releases')
            self._cache_response(cache_key, result, 200, cache_timeout)

            return result, 200

        except Exception as e:
            print(f"Error fetching Spotify charts: {e}")
            return {'albums': {'items': [], 'total': 0, 'limit': limit, 'offset': offset}}, 500

    def _parse_chart_albums(self, charts_data: Dict[str, Any]) -> list[Dict[str, Any]]:
        try:
            # Get chartEntryViewResponses[1] which contains albums
            chart_responses = charts_data.get('chartEntryViewResponses', [])
            if len(chart_responses) < 2:
                return []

            albums_chart = chart_responses[1]
            entries = albums_chart.get('entries', [])

            albums = []
            for entry in entries:
                album_metadata = entry.get('albumMetadata', {})
                if not album_metadata:
                    continue

                # Extract album ID from URI (format: "spotify:album:ID")
                album_uri = album_metadata.get('albumUri', '')
                album_id = album_uri.split(':')[-1] if album_uri else None
                if not album_id:
                    continue

                # Convert chart format to Spotify API format
                album = {
                    'id': album_id,
                    'name': album_metadata.get('albumName', ''),
                    'album_type': 'album',  # Charts only show albums, not singles
                    'images': [],
                    'artists': [],
                    'release_date': album_metadata.get('releaseDate', ''),
                    'external_urls': {
                        'spotify': f'https://open.spotify.com/album/{album_id}'
                    }
                }

                # Add image if available
                display_image = album_metadata.get('displayImageUri')
                if display_image:
                    album['images'] = [
                        {'url': display_image, 'height': 640, 'width': 640},
                        {'url': display_image, 'height': 300, 'width': 300},
                        {'url': display_image, 'height': 64, 'width': 64}
                    ]

                # Add artists
                artists_data = album_metadata.get('artists', [])
                for artist in artists_data:
                    artist_name = artist.get('name')
                    artist_uri = artist.get('spotifyUri', '')
                    artist_id = artist_uri.split(':')[-1] if artist_uri else None

                    if artist_name:
                        album['artists'].append({
                            'name': artist_name,
                            'id': artist_id,
                            'uri': artist_uri,
                            'external_urls': {
                                'spotify': f'https://open.spotify.com/artist/{artist_id}'
                            } if artist_id else {}
                        })

                albums.append(album)

            return albums

        except Exception as e:
            print(f"Error parsing chart albums: {e}")
            return []

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
