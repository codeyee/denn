from django.core.cache import cache
from django.conf import settings
from functools import wraps
import hashlib
import json
from typing import Any, Callable, Optional


def cache_key_generator(*args, **kwargs) -> str:
    key_data = {'args': args, 'kwargs': kwargs}
    key_string = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.md5(key_string.encode()).hexdigest()


def cached_view(
    cache_type: str = 'homepage',
    timeout: Optional[int] = None,
    key_prefix: Optional[str] = None
):
    def decorator(view_func: Callable) -> Callable:
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            if key_prefix: cache_key = key_prefix.format(**kwargs)
            else:
                cache_key_template = settings.CACHE_KEYS.get(cache_type, f'{cache_type}:{{}}')
                query_params = {k: v[0] if isinstance(v, list) and len(v) == 1 else v for k, v in request.GET.items()}
                format_params = {**kwargs, **query_params}
                cache_key = cache_key_template.format(**format_params)

            cache_timeout = timeout if timeout is not None else settings.CACHE_TIMEOUTS.get(cache_type, 3600)

            cached_response = cache.get(cache_key)
            if cached_response is not None:
                from rest_framework.response import Response
                return Response(cached_response)

            response = view_func(self, request, *args, **kwargs)

            if hasattr(response, 'status_code') and response.status_code == 200:
                cache.set(cache_key, response.data, cache_timeout)

            return response

        return wrapper

    return decorator

def invalidate_cache_pattern(pattern: str) -> int:
    try:
        if hasattr(cache, '_cache') and hasattr(cache._cache, 'delete_pattern'):
            return cache._cache.delete_pattern(pattern)
        else:
            # For other backends, we can't easily pattern match
            # This is a limitation of Django's cache framework
            return 0
    except Exception:
        return 0

def invalidate_homepage_cache():
    return invalidate_cache_pattern('homepage:*')

def clear_all_cache():
    cache.clear()

def get_cache_info():
    try:
        if hasattr(cache, '_cache') and hasattr(cache._cache, 'info'):
            return cache._cache.info()
        else:
            return {'backend': str(type(cache._cache).__name__)}
    except Exception:
        return {'error': 'Unable to get cache info'}
