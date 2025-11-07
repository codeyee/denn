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

# API Keys storage in cache
API_KEYS_CACHE = {
    'igdb': {
        'access_token': None,
        'token_expires_at': None,
        'client_id': None,
        'client_secret': None,
    },
    'spotify': {
        'access_token': None,
        'token_expires_at': None,
        'client_id': None,
        'client_secret': None,
    },
    'tmdb': {
        'api_key': None,
    },
    'openlibrary': {
        'user_agent': None,
    },
}

# Cache settings for different content types
CACHE_TIMEOUTS = {
    # General cache timeouts
    'homepage': 3600 * 12,

    # API-specific cache timeouts
    'api_igdb_search': 3600 * 6,
    'api_igdb_details': 3600 * 24,
    'api_igdb_popular': 3600 * 24,

    'api_spotify_search': 3600 * 6,
    'api_spotify_details': 3600 * 24,
    'api_spotify_new_releases': 3600 * 24,

    'api_tmdb_search': 3600 * 6,
    'api_tmdb_details': 3600 * 24,
    'api_tmdb_popular_movies': 3600 * 24,
    'api_tmdb_popular_tv': 3600 * 24,
    'api_tmdb_external_ids': 3600 * 24 * 14,
    'api_tmdb_watch_providers': 3600 * 24 * 14,
    'api_tmdb_external_ids_tv': 3600 * 24 * 14,
    'api_tmdb_watch_providers_tv': 3600 * 24 * 14,
    'api_tmdb_external_ids_season': 3600 * 24 * 14,
    'api_tmdb_watch_providers_season': 3600 * 24 * 14,
    'api_tmdb_images': 3600 * 24 * 14,
    'api_tmdb_images_tv': 3600 * 24 * 14,
    'api_tmdb_images_season': 3600 * 24 * 14,

    'api_openlibrary_search': 3600 * 6,
    'api_openlibrary_details': 3600 * 24,
    'api_openlibrary_trending': 3600 * 24 * 14,
}

# Cache key patterns
CACHE_KEYS = {
    # General cache key patterns
    'homepage': 'homepage:{limit}',

    # API-specific cache key patterns
    'api_igdb_search': 'api:igdb:search:{query}:{limit}:{offset}',
    'api_igdb_details': 'api:igdb:details:{game_id}',
    'api_igdb_popular': 'api:igdb:popular:{limit}:{offset}',
    'api_igdb_bulk': 'api:igdb:bulk:{game_ids}',

    'api_spotify_search': 'api:spotify:search:{query}:{search_type}:{limit}:{offset}',
    'api_spotify_details': 'api:spotify:details:{album_id}',
    'api_spotify_new_releases': 'api:spotify:new_releases:{limit}:{offset}',
    'api_spotify_bulk': 'api:spotify:bulk:{album_ids}',

    'api_tmdb_search': 'api:tmdb:search:{query}:{page}',
    'api_tmdb_details': 'api:tmdb:details:{movie_id}',
    'api_tmdb_popular_movies': 'api:tmdb:popular:movies:{page}',
    'api_tmdb_popular_tv': 'api:tmdb:popular:tv:{page}',
    'api_tmdb_bulk': 'api:tmdb:bulk:{movie_ids}',
    'api_tmdb_external_ids': 'api:tmdb:external_ids:movie:{movie_id}',
    'api_tmdb_watch_providers': 'api:tmdb:watch_providers:movie:{movie_id}',
    'api_tmdb_external_ids_tv': 'api:tmdb:external_ids:tv:{tv_id}',
    'api_tmdb_watch_providers_tv': 'api:tmdb:watch_providers:tv:{tv_id}',
    'api_tmdb_external_ids_season': 'api:tmdb:external_ids:season:{tv_id}:{season_number}',
    'api_tmdb_watch_providers_season': 'api:tmdb:watch_providers:season:{tv_id}:{season_number}',
    'api_tmdb_images': 'api:tmdb:images:movie:{movie_id}',
    'api_tmdb_images_tv': 'api:tmdb:images:tv:{tv_id}',
    'api_tmdb_images_season': 'api:tmdb:images:season:{tv_id}:{season_number}',

    'api_openlibrary_search': 'api:openlibrary:search:{query}:{page}:{limit}',
    'api_openlibrary_details': 'api:openlibrary:details:{book_key}',
    'api_openlibrary_trending': 'api:openlibrary:trending:{limit}',
    'api_openlibrary_bulk': 'api:openlibrary:bulk:{book_keys}',
}
