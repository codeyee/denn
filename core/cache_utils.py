from django.core.cache import cache
from django.conf import settings
from functools import wraps
import hashlib
import json
from typing import Any, Callable, Optional

def cache_key_generator(*args, **kwargs) -> str:
    key_data = {
        'args': args,
        'kwargs': kwargs
    }

    key_string = json.dumps(key_data, sort_keys=True, default=str)
    return hashlib.md5(key_string.encode()).hexdigest()

def normalize_query_params(query_params: dict) -> str:
    """
    Normalize query params for cache key generation.
    Sorts fields and removes empty values to ensure consistent cache keys.

    Examples:
        {'fields': 'title,id', 'limit': '10'} -> 'fields=id,title:limit=10'
        {'expand': 'items,owner'} -> 'expand=items,owner'
    """
    normalized = {}

    # Sort comma-separated values for consistency
    for key, value in query_params.items():
        if not value:  # Skip empty values
            continue

        str_value = str(value)
        if ',' in str_value:
            # Sort comma-separated lists (fields, expand, omit)
            normalized[key] = ','.join(sorted(str_value.split(',')))
        else:
            normalized[key] = str_value

    # Create deterministic string
    items = sorted(normalized.items())
    return ':'.join(f"{k}={v}" for k, v in items)

def cached_view(
    cache_type: str = None,
    timeout: Optional[int] = None,
    key_prefix: Optional[str] = None,
    include_query_params: bool = True
):
    """
    Cache decorator for Django REST Framework views.

    Args:
        cache_type: Type of cache to use (maps to CACHE_KEYS and CACHE_TIMEOUTS in settings)
        timeout: Cache timeout in seconds (overrides CACHE_TIMEOUTS setting)
        key_prefix: Custom cache key prefix (overrides CACHE_KEYS setting)
        include_query_params: Include query params in cache key to prevent collisions (default: True)

    The decorator now includes query params in the cache key to prevent cache collisions
    when using drf-flex-fields or other query-based filtering.

    Example:
        GET /api/homepage?fields=id,title -> cache_key: "homepage:10:a1b2c3d4"
        GET /api/homepage?fields=*       -> cache_key: "homepage:10:e5f6g7h8"
    """
    def decorator(view_func: Callable) -> Callable:
        @wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            # Build base cache key from template
            if key_prefix:
                cache_key = key_prefix.format(**kwargs)
            else:
                cache_key_template = settings.CACHE_KEYS.get(cache_type, f'{cache_type}:{{}}')
                query_params = {k: v[0] if isinstance(v, list) and len(v) == 1 else v
                               for k, v in request.GET.items()}
                format_params = {**kwargs, **query_params}
                cache_key = cache_key_template.format(**format_params)

            # Append query params hash for uniqueness (prevents cache collisions)
            if include_query_params and request.GET:
                query_params_dict = dict(request.GET.items())
                query_params_str = normalize_query_params(query_params_dict)
                if query_params_str:
                    # Append short hash of query params to cache key
                    params_hash = hashlib.md5(query_params_str.encode()).hexdigest()[:8]
                    cache_key = f"{cache_key}:{params_hash}"

            cache_timeout = timeout if timeout is not None else settings.CACHE_TIMEOUTS.get(cache_type, 3600)

            # Try to get cached response
            cached_response = cache.get(cache_key)
            if cached_response is not None:
                from rest_framework.response import Response
                return Response(cached_response)

            # Execute view function
            response = view_func(self, request, *args, **kwargs)

            # Cache successful responses
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
