import requests
from typing import Dict, Any, Tuple, Optional
from django.conf import settings
from .base import BaseAPIClient
from proxy.errors import (
    build_error_response,
    get_http_status,
    TIMEOUT,
    CONNECTION_ERROR,
    RESPONSE_NOT_JSON,
    INTERNAL_SERVER_ERROR,
    UNAUTHORIZED
)

class IGDBClient(BaseAPIClient):
    def __init__(self):
        config = settings.PROXY_API['IGDB']
        super().__init__(base_url=config['BASE_URL'])
        self.client_id = config['CLIENT_ID']
        self.client_secret = config['CLIENT_SECRET']
        self.access_token = self._get_access_token()

    def _get_access_token(self) -> str:
        url = 'https://id.twitch.tv/oauth2/token'
        params = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'grant_type': 'client_credentials'
        }
        try:
            response = requests.post(url, params=params, timeout=self.timeout)
            response.raise_for_status()
            return response.json()['access_token']
        except Exception:
            return ''

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

    def search_games(self, query: str, limit: int = 10, offset: int = 0) -> Tuple[Dict[str, Any], int]:
        endpoint = 'games'
        fields = 'id,name,summary,storyline,cover.url,first_release_date,platforms.name,game_type'
        body = f'search "{query}"; fields {fields}; where game_type = (0,6,8,9); limit {limit}; offset {offset};'
        return self.request_igdb(endpoint, body)

    def get_game_details(self, game_id: int) -> Tuple[Dict[str, Any], int]:
        endpoint = 'games'
        fields = 'id,name,summary,storyline,cover.url,first_release_date,platforms.name,game_type'
        body = f'fields {fields}; where id = {game_id};'
        return self.request_igdb(endpoint, body)

