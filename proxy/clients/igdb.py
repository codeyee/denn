import requests
from typing import Dict, Any, Tuple, Optional
from django.conf import settings
from .base.cached import CachedAPIClient
from concurrent.futures import ThreadPoolExecutor
from proxy.exceptions import (
    TimeoutException,
    ConnectionErrorException,
    ResponseNotJsonException,
    InternalServerException,
    UnauthorizedException
)
from time import time

class IGDBClient(CachedAPIClient):
    def __init__(self):
        config = settings.PROXY_API['IGDB']
        super().__init__(base_url=config['BASE_URL'], api_name='igdb')

        self.client_id = settings.API_KEYS_CACHE['igdb']['client_id'] or config['CLIENT_ID']
        self.client_secret = settings.API_KEYS_CACHE['igdb']['client_secret'] or config['CLIENT_SECRET']

        settings.API_KEYS_CACHE['igdb']['client_id'] = self.client_id
        settings.API_KEYS_CACHE['igdb']['client_secret'] = self.client_secret
        self._save_api_keys()

        self.access_token = self._get_or_refresh_token()

    def _is_token_valid(self) -> bool:
        access_token = settings.API_KEYS_CACHE['igdb']['access_token']
        token_expires_at = settings.API_KEYS_CACHE['igdb']['token_expires_at']

        if not access_token or not token_expires_at: 
            return False

        buffer_time = settings.PROXY_API['IGDB']['TOKEN_BUFFER_TIME']
        return time() < (token_expires_at - buffer_time)

    def _fetch_new_token(self) -> str:
        url = settings.PROXY_API['IGDB']['AUTH_URL']
        params = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'grant_type': 'client_credentials'
        }

        try:
            timeout = self._get_timeout('auth')
            response = requests.post(url, params=params, timeout=timeout)
            response.raise_for_status()
            data = response.json()

            settings.API_KEYS_CACHE['igdb']['access_token'] = data['access_token']
            settings.API_KEYS_CACHE['igdb']['token_expires_at'] = time() + data['expires_in']
            self._save_api_keys()

            return data['access_token']
        except Exception:
            return ''

    def _get_or_refresh_token(self) -> str:
        if self._is_token_valid(): 
            return settings.API_KEYS_CACHE['igdb']['access_token']
        return self._fetch_new_token()

    def get_headers(self) -> Dict[str, str]:
        return {
            'Client-ID': self.client_id,
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'text/plain',
            'Accept': 'application/json'
        }

    def request_igdb(
        self,
        endpoint: str,
        body: str,
        params: Optional[Dict[str, Any]] = None,
        operation: str = 'search'
    ) -> Tuple[Dict[str, Any], int]:
        url = self.build_url(endpoint)
        headers = self.get_headers()

        try:
            timeout = self._get_timeout(operation)
            response = requests.post(
                url=url,
                headers=headers,
                params=params,
                data=body,
                timeout=timeout
            )

            if response.status_code == 401:
                raise UnauthorizedException()

            try:
                response_data = response.json()
            except ValueError:
                raise ResponseNotJsonException(f'Non-JSON response: {response.text}')

            return response_data, response.status_code

        except requests.exceptions.Timeout:
            raise TimeoutException()

        except requests.exceptions.ConnectionError:
            raise ConnectionErrorException()

        except (TimeoutException, ConnectionErrorException, ResponseNotJsonException, UnauthorizedException):
            raise

        except Exception as e:
            raise InternalServerException(custom_message=str(e))

    def cached_igdb_post(
        self,
        endpoint: str,
        cache_type: str,
        body: str,
        params: Optional[Dict[str, Any]] = None,
        operation: str = 'search',
        **cache_kwargs
    ) -> Tuple[Dict[str, Any], int]:
        cache_key = self._generate_cache_key(cache_type, **cache_kwargs)
        cached_response = self._get_cached_response(cache_key)
        if cached_response is not None:
            return cached_response

        original_timeout = self.timeout
        self.timeout = self._get_timeout(operation)
        try:
            data, status_code = self.request_igdb(
                endpoint=endpoint,
                body=body,
                params=params,
                operation=operation
            )
            if status_code == 200:
                cache_timeout = self._get_cache_timeout(cache_type)
                self._cache_response(cache_key, data, status_code, cache_timeout)
            return data, status_code
        finally:
            self.timeout = original_timeout

    def get_fields(self) -> str:
        return ','.join([
            'id',
            'name',
            'summary',
            'storyline',
            'cover.url',
            'cover.image_id',
            'screenshots.url',
            'screenshots.image_id',
            'artworks.url',
            'artworks.image_id',
            'first_release_date',
            'platforms.name',
            'game_type',
            'involved_companies.company.name',
            'involved_companies.developer'
        ])

    def get_included_game_types(self) -> str:
        # 0 = Main game
        # 8 = Remake
        return ','.join(['0', '8'])

    def search_games(self, query: str, limit: int = 50, offset: int = 0) -> Tuple[Dict[str, Any], int]:
        endpoint = 'games'
        fields = self.get_fields()
        included_game_types = self.get_included_game_types()
        body = f'search "{query}"; fields {fields}; where game_type = ({included_game_types}); limit {limit}; offset {offset};'
        return self.cached_igdb_post(
            endpoint=endpoint,
            cache_type='api_igdb_search',
            body=body,
            operation='search',
            query=query,
            limit=limit,
            offset=offset
        )

    def get_game(self, game_id: int) -> Tuple[Dict[str, Any], int]:
        endpoint = 'games'
        fields = self.get_fields()
        body = f'fields {fields}; where id = {game_id};'
        return self.cached_igdb_post(
            endpoint=endpoint,
            cache_type='api_igdb_details',
            body=body,
            operation='details',
            game_id=game_id
        )

    def get_bulk_games(self, game_ids: list[int]) -> Tuple[Dict[str, Any], int]:
        if not game_ids: return [], 200

        # Check cache first
        cache_key = self._generate_cache_key('api_igdb_bulk', game_ids=game_ids)
        cached_response = self._get_cached_response(cache_key)
        if cached_response is not None:
            return cached_response

        # IGDB has a limit on the number of IDs in a single query
        # Split into batches of 50 for parallel processing
        batch_size = 50
        if len(game_ids) <= batch_size:
            endpoint = 'games'
            fields = self.get_fields()
            ids_str = ','.join(str(id) for id in game_ids)
            body = f'fields {fields}; where id = ({ids_str}); limit {len(game_ids)};'
            data, status_code = self.request_igdb(endpoint, body, operation='bulk')

            if status_code == 200:
                cache_timeout = self._get_cache_timeout('api_igdb_details')
                self._cache_response(cache_key, data, status_code, cache_timeout)

            return data, status_code

        def fetch_games_batch(batch_ids: list[int]) -> Tuple[list[Dict[str, Any]], int]:
            endpoint = 'games'
            fields = self.get_fields()
            ids_str = ','.join(str(id) for id in batch_ids)
            body = f'fields {fields}; where id = ({ids_str}); limit {len(batch_ids)};'
            data, status_code = self.request_igdb(endpoint, body)
            return data if isinstance(data, list) else [], status_code

        batches = [game_ids[i:i + batch_size] for i in range(0, len(game_ids), batch_size)]
        all_games = []

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = [executor.submit(fetch_games_batch, batch) for batch in batches]
            for future in futures:
                games, status_code = future.result()
                if status_code == 200:
                    all_games.extend(games)

        return all_games, 200

    def get_popular_games(self, limit: int = 50, offset: int = 0) -> Tuple[Dict[str, Any], int]:
        endpoint = 'games'
        fields = self.get_fields()
        included_game_types = self.get_included_game_types()
        body = f'fields {fields}; where game_type = ({included_game_types}) & aggregated_rating != null; sort aggregated_rating desc; limit {limit}; offset {offset};'
        return self.cached_igdb_post(
            endpoint=endpoint,
            cache_type='api_igdb_popular',
            body=body,
            operation='search',
            limit=limit,
            offset=offset
        )
