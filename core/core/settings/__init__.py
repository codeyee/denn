# Import all settings from modules
from .base import *
from .static import *
from .db import *
from .drf import *
from .jwt import *
from .cors import *
from .docs import *
from .cache import *
from .security import *

# Make settings available
__all__ = [
    # Base settings
    "BASE_DIR",
    "SECRET_KEY",
    "DEBUG",
    "TESTING",
    "ALLOWED_HOSTS",
    "INSTALLED_APPS",
    "MIDDLEWARE",
    "ROOT_URLCONF",
    "TEMPLATES",
    "WSGI_APPLICATION",
    "AUTH_PASSWORD_VALIDATORS",
    "LANGUAGE_CODE",
    "TIME_ZONE",
    "USE_I18N",
    "USE_TZ",
    "DEFAULT_AUTO_FIELD",
    # Database
    "DATABASES",
    # Static files
    "STATIC_URL",
    "STATIC_ROOT",
    "STATICFILES_DIRS",
    "STORAGES",
    # REST Framework
    "REST_FRAMEWORK",
    "REST_AUTH",
    # JWT
    "SIMPLE_JWT",
    # CORS & CSRF
    "CORS_ALLOWED_ORIGINS",
    "CORS_ALLOWED_ORIGIN_REGEXES",
    "CORS_ALLOW_HEADERS",
    "CORS_EXPOSE_HEADERS",
    "CORS_ALLOW_CREDENTIALS",
    "CSRF_TRUSTED_ORIGINS",
    # Documentation
    "SPECTACULAR_SETTINGS",
    # Cache
    "CACHES",
    # Proxy API
    "PROXY_API_BASE_URL",
    "PROXY_API_KEY",
    # Sprint 07 — local-first content domain
    "CONTENT_REHYDRATION_POLICY",
    "DEFAULT_COUNTRY",
    "FORCE_PROXY_FETCH",
]
