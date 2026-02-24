from django.core.cache import cache


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
