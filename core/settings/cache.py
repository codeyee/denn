import os

# Cache configuration
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1'),
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        },
        'KEY_PREFIX': 'denn_api',
        'TIMEOUT': 3600,
    },
    # Fallback cache for development
    'fallback': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'TIMEOUT': 3600,
    }
}

# Use fallback cache if Redis is not available
if not os.getenv('REDIS_URL'):
    CACHES['default'] = CACHES['fallback']

# Cache settings for different content types
CACHE_TIMEOUTS = {
    'homepage': 3600 * 12,
    'suggestions': 3600 * 12,
    'details': 3600 * 6,
    'search': 3600 * 3,
}

# Cache key patterns
CACHE_KEYS = {
    'homepage': 'homepage:{limit}',
    'search': 'search:{category}:{query}:{page}:{limit}',
    'details': 'details:{category}:{id}',
    'suggestions': 'suggestions:{category}:{limit}',
}
