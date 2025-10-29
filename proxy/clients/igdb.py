import requests
from typing import Dict, Any, Tuple, Optional
from django.conf import settings
from .base import BaseAPIClient
from concurrent.futures import ThreadPoolExecutor
from proxy.errors import (
    build_error_response,
    get_http_status,
    TIMEOUT,
    CONNECTION_ERROR,
    RESPONSE_NOT_JSON,
    INTERNAL_SERVER_ERROR,
    UNAUTHORIZED
)
from time import time

class IGDBClient(BaseAPIClient):
    _access_token: Optional[str] = None
    _token_expires_at: Optional[float] = None

    def __init__(self):
        config = settings.PROXY_API['IGDB']
        super().__init__(base_url=config['BASE_URL'])

        self.client_id = config['CLIENT_ID']
        self.client_secret = config['CLIENT_SECRET']
        self.access_token = self._get_or_refresh_token()

    def _is_token_valid(self) -> bool:
        if not IGDBClient._access_token or not IGDBClient._token_expires_at: return False

        buffer_time = settings.PROXY_API['IGDB']['TOKEN_BUFFER_TIME']
        return time() < (IGDBClient._token_expires_at - buffer_time)

    def _fetch_new_token(self) -> str:
        url = settings.PROXY_API['IGDB']['AUTH_URL']
        params = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'grant_type': 'client_credentials'
        }

        try:
            response = requests.post(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()

            IGDBClient._access_token = data['access_token']
            IGDBClient._token_expires_at = time() + data['expires_in']

            return IGDBClient._access_token
        except Exception:
            return ''

    def _get_or_refresh_token(self) -> str:
        if self._is_token_valid(): return IGDBClient._access_token
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
        params: Optional[Dict[str, Any]] = None
    ) -> Tuple[Dict[str, Any], int]:
        url = self.build_url(endpoint)
        headers = self.get_headers()

        try:
            response = requests.post(
                url=url,
                headers=headers,
                params=params,
                data=body,
                timeout=self.timeout
            )

            if response.status_code == 401:
                return build_error_response(UNAUTHORIZED), get_http_status(UNAUTHORIZED)

            try:
                response_data = response.json()
            except ValueError:
                response_data = build_error_response(
                    RESPONSE_NOT_JSON,
                    custom_message=f'Non-JSON response: {response.text}'
                )

            return response_data, response.status_code

        except requests.exceptions.Timeout:
            return build_error_response(TIMEOUT), get_http_status(TIMEOUT)

        except requests.exceptions.ConnectionError:
            return build_error_response(CONNECTION_ERROR), get_http_status(CONNECTION_ERROR)

        except Exception as e:
            return (
                build_error_response(INTERNAL_SERVER_ERROR, custom_message=str(e)),
                get_http_status(INTERNAL_SERVER_ERROR)
            )

    def get_fields(self) -> str:
        return ','.join([
            'id',
            'name',
            'summary',
            'storyline',
            'cover.url',
            'first_release_date',
            'platforms.name',
            'game_type',
            'involved_companies.company.name',
            'involved_companies.developer'
        ])

    def get_included_game_types(self) -> str:
        return ','.join(['0', '6', '8', '9'])

    def search_games(self, query: str, limit: int = 50, offset: int = 0) -> Tuple[Dict[str, Any], int]:
        endpoint = 'games'
        fields = self.get_fields()
        included_game_types = self.get_included_game_types()
        body = f'search "{query}"; fields {fields}; where game_type = ({included_game_types}); limit {limit}; offset {offset};'
        return self.request_igdb(endpoint, body)

    def get_bulk_games(self, game_ids: list[int]) -> Tuple[Dict[str, Any], int]:
        if not game_ids: return [], 200

        # IGDB has a limit on the number of IDs in a single query
        # Split into batches of 50 for parallel processing
        batch_size = 50
        if len(game_ids) <= batch_size:
            endpoint = 'games'
            fields = self.get_fields()
            ids_str = ','.join(str(id) for id in game_ids)
            body = f'fields {fields}; where id = ({ids_str}); limit {len(game_ids)};'
            return self.request_igdb(endpoint, body)

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
        return self.request_igdb(endpoint, body)
