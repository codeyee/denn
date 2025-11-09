import hashlib
import json
from typing import Dict, Any, Optional, Tuple, Callable, Union, List
from django.core.cache import cache
from django.conf import settings
from .base import BaseAPIClient

class CachedAPIClient(BaseAPIClient):
    def __init__(self, base_url: str, api_name: str):
        super().__init__(base_url)
        self.api_name = api_name
        self._load_api_keys()

    def _load_api_keys(self):
        api_keys = settings.API_KEYS_CACHE.get(self.api_name, {})
        for key, value in api_keys.items():
            setattr(self, key, value)

    def _save_api_keys(self):
        api_keys = settings.API_KEYS_CACHE.get(self.api_name, {})
        for key in api_keys.keys():
            if hasattr(self, key):
                api_keys[key] = getattr(self, key)
        settings.API_KEYS_CACHE[self.api_name] = api_keys

    def _get_timeout(self, operation: str) -> int:
        return self.timeout

    def _get_cache_timeout(self, cache_type: str) -> int:
        return settings.CACHE_TIMEOUTS.get(cache_type, 3600)

    def _generate_cache_key(self, cache_type: str, **kwargs) -> str:
        cache_key_template = settings.CACHE_KEYS.get(cache_type)
        formatted_kwargs = {}

        for key, value in kwargs.items():
            if isinstance(value, list):
                formatted_kwargs[key] = ','.join(sorted(map(str, value)))
            else:
                formatted_kwargs[key] = str(value)

        if cache_key_template:
            try:
                cache_key = cache_key_template.format(**formatted_kwargs)
            except (KeyError, IndexError, ValueError):
                key_string = f"{self.api_name}:{cache_type}:{json.dumps(formatted_kwargs, sort_keys=True)}"
                cache_key = hashlib.md5(key_string.encode()).hexdigest()
        else:
            key_string = f"{self.api_name}:{cache_type}:{json.dumps(formatted_kwargs, sort_keys=True)}"
            cache_key = hashlib.md5(key_string.encode()).hexdigest()

        return f"api:{cache_key}"

    def _get_cached_response(self, cache_key: str) -> Optional[Tuple[Union[Dict[str, Any], List[Dict[str, Any]]], int]]:
        cached_data = cache.get(cache_key)
        if cached_data is not None:
            return cached_data.get('data'), cached_data.get('status_code')
        return None

    def _cache_response(self, cache_key: str, data: Union[Dict[str, Any], List[Dict[str, Any]]], status_code: int, cache_timeout: int):
        cache_data = {
            'data': data,
            'status_code': status_code
        }
        cache.set(cache_key, cache_data, cache_timeout)

    def cached_request(
        self,
        method: str,
        endpoint: str,
        cache_type: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None,
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
            data, status_code = self.request(method, endpoint, params, data, headers)

            if status_code == 200:
                cache_timeout = self._get_cache_timeout(cache_type)
                self._cache_response(cache_key, data, status_code, cache_timeout)

            return data, status_code
        finally:
            self.timeout = original_timeout

    def cached_get(
        self,
        endpoint: str,
        cache_type: str,
        params: Optional[Dict[str, Any]] = None,
        operation: str = 'search',
        **cache_kwargs
    ) -> Tuple[Dict[str, Any], int]:
        return self.cached_request(
            'GET', endpoint, cache_type, params=params, operation=operation, **cache_kwargs
        )

    def cached_post(
        self,
        endpoint: str,
        cache_type: str,
        data: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
        operation: str = 'search',
        **cache_kwargs
    ) -> Tuple[Dict[str, Any], int]:
        return self.cached_request(
            'POST', endpoint, cache_type, data=data, params=params, operation=operation, **cache_kwargs
        )

    def invalidate_cache_pattern(self, pattern: str) -> int:
        try:
            if hasattr(cache, 'delete_pattern'):
                return cache.delete_pattern(pattern)
            else:
                return 0
        except Exception:
            return 0

    def clear_all_cache(self) -> int:
        pattern = f"api:{self.api_name}:*"
        return self.invalidate_cache_pattern(pattern)

    def get_cache_info(self) -> Dict[str, Any]:
        try:
            if hasattr(cache, 'get_client'):
                client = cache.get_client()
                if hasattr(client, 'info'):
                    return client.info()
        except Exception:
            pass
        return {'status': 'unknown'}
