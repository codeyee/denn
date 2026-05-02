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

CONTENT_REHYDRATION_POLICY = {
    "BANDS": [
        {"name": "pre_release", "max_age_days": -1, "ttl_days": 1},
        {"name": "hot", "max_age_days": 29, "ttl_days": 2},
        {"name": "recent", "max_age_days": 179, "ttl_days": 7},
        {"name": "first_year", "max_age_days": 364, "ttl_days": 14},
        {"name": "stable", "max_age_days": 1094, "ttl_days": 30},
        {"name": "aged", "max_age_days": 3649, "ttl_days": 90},
        {"name": "classic", "max_age_days": None, "ttl_days": 180},
    ],
    "UNKNOWN_TTL_DAYS": 30,
    "TYPE_OVERRIDES": {
        "BOOK": {"multiplier": 2.0, "classic_ttl_days": 365},
        "ALBUM": {"classic_ttl_days": 365},
        "TV_SHOW": {
            "active_statuses": ["returning series", "in production"],
            "active_ttl_days": 2,
            "active_band": "hot",
        },
    },
}

# Country used when the request did not specify one. Streaming providers
# are country-scoped on the proxy side via the X-User-Country header.
DEFAULT_COUNTRY = os.getenv("DEFAULT_COUNTRY", "US")

# Sprint 07: read-path debugging knob. When True, the orchestrator
# ignores fresh local Detail rows and forces a proxy fetch.
FORCE_PROXY_FETCH = os.getenv("FORCE_PROXY_FETCH", "False") == "True"
