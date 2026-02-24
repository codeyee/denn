import os

# Cache configuration
REDIS_CONFIG = {
    'BACKEND': 'django_redis.cache.RedisCache',
    'LOCATION': os.getenv('REDIS_URL', 'redis://127.0.0.1:6379/1'),
    'OPTIONS': {'CLIENT_CLASS': 'django_redis.client.DefaultClient'},
    'KEY_PREFIX': 'denn_api',
    'TIMEOUT': 3600,
}

FALLBACK_CONFIG = {
    'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
    'LOCATION': 'unique-snowflake',
    'TIMEOUT': 3600,
}

CACHES = {
    'default': REDIS_CONFIG,
    'fallback': FALLBACK_CONFIG,
}

# Use fallback cache if Redis is not available
if not os.getenv('REDIS_URL'):
    CACHES['default'] = CACHES['fallback']

# Cache settings for content types still managed by this API
CACHE_TIMEOUTS = {
    'homepage': 3600 * 24,
}

# Cache key patterns for this API
CACHE_KEYS = {
    'homepage': 'homepage:{limit}',
}
