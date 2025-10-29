import os

# TMDB (The Movie Database) Configuration
TMDB_CONFIG = {
    "API_KEY": os.getenv("TMDB_API_KEY"),
    "BASE_URL": "https://api.themoviedb.org/3",
    "IMAGES_BASE_URL": "https://image.tmdb.org/t/p/",
}

# IGDB (Internet Game Database) Configuration
IGDB_CONFIG = {
    "CLIENT_ID": os.getenv("IGDB_CLIENT_ID"),
    "CLIENT_SECRET": os.getenv("IGDB_CLIENT_SECRET"),
    "AUTH_URL": "https://id.twitch.tv/oauth2/token",
    "BASE_URL": "https://api.igdb.com/v4",
    "TOKEN_BUFFER_TIME": 60,  # seconds before token expiry to refresh
}

# Spotify Configuration
SPOTIFY_CONFIG = {
    "CLIENT_ID": os.getenv("SPOTIFY_CLIENT_ID"),
    "CLIENT_SECRET": os.getenv("SPOTIFY_CLIENT_SECRET"),
    "AUTH_URL": "https://accounts.spotify.com/api/token",
    "BASE_URL": "https://api.spotify.com/v1",
    "TOKEN_BUFFER_TIME": 60,  # seconds before token expiry to refresh
}

# OpenLibrary Configuration
OPENLIBRARY_CONFIG = {
    "USER_AGENT": os.getenv("OPENLIBRARY_USER_AGENT"),
    "BASE_URL": "https://openlibrary.org",
    "COVERS_BASE_URL": "https://covers.openlibrary.org",
}

# API-specific timeout configurations (in seconds)
API_TIMEOUTS = {
    'igdb': {
        'search': 15,
        'details': 20,
        'bulk': 30,
        'auth': 10,
    },
    'spotify': {
        'search': 10,
        'details': 15,
        'bulk': 25,
        'auth': 8,
    },
    'tmdb': {
        'search': 12,
        'details': 15,
        'bulk': 30,
    },
    'openlibrary': {
        'search': 15,
        'details': 20,
        'bulk': 25,
    },
}

# Consolidated proxy API configuration
PROXY_API = {
    "TMDB": TMDB_CONFIG,
    "IGDB": IGDB_CONFIG,
    "SPOTIFY": SPOTIFY_CONFIG,
    "OPENLIBRARY": OPENLIBRARY_CONFIG,
}
