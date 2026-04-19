import os

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

if not os.getenv('REDIS_URL'):
    CACHES['default'] = CACHES['fallback']
