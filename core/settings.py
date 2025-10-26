import os
from pathlib import Path
from dotenv import load_dotenv

# Application definition
BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(os.path.join(BASE_DIR, ".env"))

SECRET_KEY = os.getenv("SECRET_KEY")

DEBUG = True

ALLOWED_HOSTS = []

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    # Third party apps
    "rest_framework",
    "corsheaders",
    # Local apps
    "proxy",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "corsheaders.middleware.CorsMiddleware",  # CORS debe ir temprano
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "core.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    },
]

WSGI_APPLICATION = "core.wsgi.application"

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.MinimumLengthValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.CommonPasswordValidator",
    },
    {
        "NAME": "django.contrib.auth.password_validation.NumericPasswordValidator",
    },
]

LANGUAGE_CODE = "en-us"

TIME_ZONE = "UTC"

USE_I18N = True

USE_TZ = True

STATIC_URL = "static/"

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Django REST Framework Configuration
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
    ],
    # Timeout por defecto para las peticiones al proxy
    'TIMEOUT': 30,
}

# CORS Configuration (permitir peticiones desde el frontend)
CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

CORS_ALLOW_CREDENTIALS = True

# Proxy API configuration
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
}
