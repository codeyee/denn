import os
import sys
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent.parent
load_dotenv(os.path.join(BASE_DIR, ".env"))

# Security settings
SECRET_KEY = os.getenv("SECRET_KEY")
DEBUG = os.getenv("DEBUG", "False") == "True"
TESTING = "test" in sys.argv

# Allowed hosts configuration
allowed_hosts_env = os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1")
ALLOWED_HOSTS = [host.strip() for host in allowed_hosts_env.split(",")]

# Always allow 127.0.0.1 for Docker healthchecks
if "127.0.0.1" not in ALLOWED_HOSTS:
    ALLOWED_HOSTS.append("127.0.0.1")

# Railway platform support
if os.getenv("RAILWAY_PUBLIC_DOMAIN"):
    ALLOWED_HOSTS.append(os.getenv("RAILWAY_PUBLIC_DOMAIN"))

if os.getenv("RAILWAY_ENVIRONMENT"):
    ALLOWED_HOSTS.append(".railway.app")

# Application definition
DJANGO_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
]

THIRD_PARTY_APPS = [
    "rest_framework",
    "rest_framework.authtoken",
    "rest_framework_simplejwt",
    "rest_framework_simplejwt.token_blacklist",
    "dj_rest_auth",
    "corsheaders",
    "drf_spectacular",
]

PROJECT_APPS = [
    "authentication",
    "content",
]

INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + PROJECT_APPS

# Middleware configuration
# RequestIdMiddleware MUST stay first so every request — including those
# rejected by SecurityMiddleware or auth — carries a correlation ID.
MIDDLEWARE = [
    "core.middleware.RequestIdMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
    "core.middleware.AccessLogMiddleware",
    "core.middleware.PerfTimingMiddleware",
]

# Structured logging (JSON, stdlib only — see core/logging.py).
# Tests opt out so unittest output stays readable.
if not TESTING:
    from core.logging import build_logging_config
    LOGGING = build_logging_config(level=os.getenv("LOG_LEVEL", "INFO"))

# URL configuration
ROOT_URLCONF = "core.urls"

# Template configuration
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

# WSGI application
WSGI_APPLICATION = "core.wsgi.application"

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

# Internationalization
LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

# Default primary key field type
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# Proxy API (Go microservice) configuration
PROXY_API_BASE_URL = os.getenv("PROXY_API_BASE_URL", "http://localhost:8080/v1/proxy")
PROXY_API_KEY = os.getenv("PROXY_API_KEY", "")

# Sprint 07: per-content-type TTL for the local Detail rows. The
# rehydration job (and read-time stale check) consults this map; missing
# keys fall back to the longest TTL to err on the side of fewer proxy hits.
CONTENT_REHYDRATION_TTL = {
    "BOOK": timedelta(days=90),
    "MOVIE": timedelta(days=30),
    "GAME": timedelta(days=30),
    "ALBUM": timedelta(days=30),
    "TV_SHOW": timedelta(days=7),
    "SEASON": timedelta(days=7),
}

# Country used when the request did not specify one. Streaming providers
# are country-scoped on the proxy side via the X-User-Country header.
DEFAULT_COUNTRY = os.getenv("DEFAULT_COUNTRY", "US")

# Sprint 07: read-path debugging knob. When True, the orchestrator
# ignores fresh local Detail rows and forces a proxy fetch.
FORCE_PROXY_FETCH = os.getenv("FORCE_PROXY_FETCH", "False") == "True"
