import os
import requests
from typing import Dict, Any, Tuple, Optional, Union, List
from django.conf import settings
from .base.cached import CachedAPIClient
from concurrent.futures import ThreadPoolExecutor
from core.exceptions import (
    TimeoutException,
    ConnectionErrorException,
    ResponseNotJsonException,
    InternalServerException,
    UnauthorizedException
)
from time import time

IGDB_CLIENT_ID = os.getenv("IGDB_CLIENT_ID")
IGDB_CLIENT_SECRET = os.getenv("IGDB_CLIENT_SECRET")
IGDB_AUTH_URL = "https://id.twitch.tv/oauth2/token"
IGDB_BASE_URL = "https://api.igdb.com/v4"
IGDB_TOKEN_BUFFER_TIME = 60 * 60

class IGDBClient(CachedAPIClient):
    def __init__(self):
        super().__init__(base_url=IGDB_BASE_URL, api_name='igdb')

        self.client_id = settings.API_KEYS_CACHE['igdb']['client_id'] or IGDB_CLIENT_ID
        self.client_secret = settings.API_KEYS_CACHE['igdb']['client_secret'] or IGDB_CLIENT_SECRET

        settings.API_KEYS_CACHE['igdb']['client_id'] = self.client_id
        settings.API_KEYS_CACHE['igdb']['client_secret'] = self.client_secret
        self._save_api_keys()

        self.access_token = self._get_or_refresh_token()

    def _is_token_valid(self) -> bool:
        access_token = settings.API_KEYS_CACHE['igdb']['access_token']
        token_expires_at = settings.API_KEYS_CACHE['igdb']['token_expires_at']

        if not access_token or not token_expires_at:
            return False

        return time() < (token_expires_at - IGDB_TOKEN_BUFFER_TIME)

    def _fetch_new_token(self) -> str:
        params = {
            'client_id': self.client_id,
            'client_secret': self.client_secret,
            'grant_type': 'client_credentials'
        }

        try:
            timeout = self._get_timeout('auth')
            response = requests.post(IGDB_AUTH_URL, params=params, timeout=timeout)
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
    ) -> Tuple[Union[Dict[str, Any], List[Dict[str, Any]]], int]:
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
    ) -> Tuple[Union[Dict[str, Any], List[Dict[str, Any]]], int]:
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
            'platforms.platform_logo.image_id',
            'game_type',
            'involved_companies.company.name',
            'involved_companies.developer'
        ])

    def get_included_game_types(self) -> str:
        return ','.join(['0', '4', '8', '9'])

    def _is_web_browser_only(self, game: Dict[str, Any]) -> bool:
        """
        Check if a game is only available on web browser platform.
        Returns True if the game should be filtered out (web browser only).
        """
        platforms = game.get('platforms')

        # If no platform data, don't filter
        if not platforms or not isinstance(platforms, list):
            return False

        # If game has multiple platforms, it's not browser-only
        if len(platforms) > 1:
            return False

        # Check if the single platform is web browser
        platform_name = platforms[0].get('name', '').lower() if isinstance(platforms[0], dict) else ''
        return platform_name in ['web browser', 'browser']

    def search_games(self, query: str, limit: int = 50, offset: int = 0) -> Tuple[List[Dict[str, Any]], int]:
        endpoint = 'games'
        fields = self.get_fields()
        included_game_types = self.get_included_game_types()
        body = f'search "{query}"; fields {fields}; where game_type = ({included_game_types}); limit {limit}; offset {offset};'
        data, status_code = self.cached_igdb_post(
            endpoint=endpoint,
            cache_type='api_igdb_search',
            body=body,
            operation='search',
            query=query,
            limit=limit,
            offset=offset
        )
        if isinstance(data, dict):
            data = [data]

        # Filter out web-browser-only games
        data = [game for game in data if not self._is_web_browser_only(game)]

        return data, status_code

    def get_game(self, game_id: int) -> Tuple[Optional[Dict[str, Any]], int]:
        endpoint = 'games'
        fields = self.get_fields()
        body = f'fields {fields}; where id = {game_id};'
        data, status_code = self.cached_igdb_post(
            endpoint=endpoint,
            cache_type='api_igdb_details',
            body=body,
            operation='details',
            game_id=game_id
        )
        if isinstance(data, list) and data:
            return data[0], status_code
        elif isinstance(data, dict):
            return data, status_code
        return None, status_code

    def get_bulk_games(self, game_ids: list[int]) -> Tuple[List[Dict[str, Any]], int]:
        if not game_ids: return [], 200

        cache_key = self._generate_cache_key('api_igdb_bulk', game_ids=game_ids)
        cached_response = self._get_cached_response(cache_key)
        if cached_response is not None:
            data, status_code = cached_response
            if isinstance(data, dict):
                data = [data]
            return data, status_code

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

            if isinstance(data, dict):
                data = [data]

            # Filter out web-browser-only games
            data = [game for game in data if not self._is_web_browser_only(game)]

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

        # Filter out web-browser-only games
        all_games = [game for game in all_games if not self._is_web_browser_only(game)]

        return all_games, 200

    def get_popular_games(self, limit: int = 50, offset: int = 0) -> Tuple[List[Dict[str, Any]], int]:
        endpoint = 'games'
        fields = self.get_fields()
        included_game_types = self.get_included_game_types()
        body = f'fields {fields}; where game_type = ({included_game_types}) & aggregated_rating != null; sort aggregated_rating desc; limit {limit}; offset {offset};'
        data, status_code = self.cached_igdb_post(
            endpoint=endpoint,
            cache_type='api_igdb_popular',
            body=body,
            operation='search',
            limit=limit,
            offset=offset
        )
        if isinstance(data, dict):
            data = [data]

        # Filter out web-browser-only games
        data = [game for game in data if not self._is_web_browser_only(game)]

        return data, status_code

    def get_popularity_primitives(self, popularity_type: int, limit: int = 100) -> Tuple[List[Dict[str, Any]], int]:
        endpoint = 'popularity_primitives'
        body = f'fields game_id,value,popularity_type; sort value desc; limit {limit}; where popularity_type = {popularity_type};'
        data, status_code = self.cached_igdb_post(
            endpoint=endpoint,
            cache_type='api_igdb_popularity',
            body=body,
            operation='search',
            popularity_type=popularity_type,
            limit=limit
        )
        if isinstance(data, dict):
            data = [data]
        return data, status_code

    def get_trending_games(
        self,
        limit: int = 50,
        offset: int = 0,
        want_to_play_weight: float = 0.7,
        visits_weight: float = 0.3,
        max_recency_boost: float = 4.0
    ) -> Tuple[List[Dict[str, Any]], int]:
        try:
            current_timestamp = int(time())

            # Fetch more than needed for better diversity
            fetch_limit = min(limit * 4, 500)

            # Fetch Want to Play and Visits metrics
            want_to_play_data, want_status = self.get_popularity_primitives(2, fetch_limit)  # Want to Play
            visits_data, visits_status = self.get_popularity_primitives(1, fetch_limit)  # IGDB Visits

            # If main metric fails, fall back to popular games
            if want_status != 200:
                return self.get_popular_games(limit, offset)

            want_to_play_map = {item['game_id']: item['value'] for item in want_to_play_data}
            visits_map = {item['game_id']: item['value'] for item in visits_data} if visits_status == 200 else {}

            # Get all unique game IDs and fetch full game details (need release dates)
            all_game_ids = list(set(want_to_play_map.keys()) | set(visits_map.keys()))
            games, status = self.get_bulk_games(all_game_ids)

            if status != 200:
                return games, status

            # Normalize values to 0-1 range for each metric
            want_to_play_max = max(want_to_play_map.values()) if want_to_play_map else 1
            visits_max = max(visits_map.values()) if visits_map else 1

            # Calculate weighted scores with recency boost
            game_scores = []
            for game in games:
                game_id = game.get('id')
                if not game_id:
                    continue

                if self._is_web_browser_only(game):
                    continue

                want_to_play_norm = (want_to_play_map.get(game_id, 0) / want_to_play_max) if want_to_play_max > 0 else 0
                visits_norm = (visits_map.get(game_id, 0) / visits_max) if visits_max > 0 else 0

                has_want = want_to_play_norm > 0
                has_visits = visits_norm > 0

                # Calculate base weighted score
                if has_want and has_visits:
                    base_score = (want_to_play_weight * want_to_play_norm) + (visits_weight * visits_norm)
                elif has_want:
                    base_score = want_to_play_norm
                elif has_visits:
                    base_score = visits_norm
                else:
                    base_score = 0

                # Apply recency boost and filter unreleased games
                release_date = game.get('first_release_date')

                # Skip unreleased games (null date or future date)
                if release_date is None or release_date > current_timestamp:
                    continue

                # Calculate dynamic recency boost based on how recent the game is
                days_since_release = (current_timestamp - release_date) / (24 * 60 * 60)

                if days_since_release < 30:  # Less than 1 month
                    multiplier = max_recency_boost
                elif days_since_release < 60:  # 1-2 months
                    multiplier = max_recency_boost * 0.80
                elif days_since_release < 90:  # 2-3 months
                    multiplier = max_recency_boost * 0.60
                elif days_since_release < 180:  # 3-6 months
                    multiplier = max_recency_boost * 0.40
                elif days_since_release < 365:  # 6-12 months
                    multiplier = max_recency_boost * 0.20
                else:  # Older than 1 year
                    multiplier = 1.0

                final_score = base_score * multiplier
                game_scores.append((game, final_score))

            # Sort by final score
            game_scores.sort(key=lambda x: x[1], reverse=True)

            # Apply offset and limit
            result_games = [game for game, _ in game_scores[offset:offset + limit]]

            return result_games, 200

        except Exception as e:
            print(f"Error fetching trending games: {e}")
            return self.get_popular_games(limit, offset)
