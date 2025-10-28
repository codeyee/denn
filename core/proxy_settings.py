import os

PROXY_API = {
    "TMDB": {
        "API_KEY": os.getenv('TMDB_API_KEY'),
        "BASE_URL": "https://api.themoviedb.org/3",
        "IMAGES_BASE_URL": "https://image.tmdb.org/t/p/",
    },
    "IGDB": {
        "CLIENT_ID": os.getenv('IGDB_CLIENT_ID'),
        "CLIENT_SECRET": os.getenv('IGDB_CLIENT_SECRET'),
        "AUTH_URL": "https://id.twitch.tv/oauth2/token",
        "BASE_URL": "https://api.igdb.com/v4",
        "TOKEN_BUFFER_TIME": 60,
    },
    "SPOTIFY": {
        "CLIENT_ID": os.getenv('SPOTIFY_CLIENT_ID'),
        "CLIENT_SECRET": os.getenv('SPOTIFY_CLIENT_SECRET'),
        "AUTH_URL": "https://accounts.spotify.com/api/token",
        "BASE_URL": "https://api.spotify.com/v1",
        "TOKEN_BUFFER_TIME": 60,
    },
    "OPENLIBRARY": {
        "USER_AGENT": os.getenv('OPENLIBRARY_USER_AGENT'),
        "BASE_URL": "https://openlibrary.org",
        "COVERS_BASE_URL": "https://covers.openlibrary.org",
    },
}
