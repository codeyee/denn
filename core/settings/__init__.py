# Import all settings from modules
from .base import *
from .database import *
from .static import *
from .rest_framework import *
from .jwt import *
from .cors import *
from .docs import *
from .proxy import *

# Make settings available
__all__ = [
    # Base settings
    "BASE_DIR",
    "SECRET_KEY",
    "DEBUG",
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
    "CORS_ALLOW_CREDENTIALS",
    "CSRF_TRUSTED_ORIGINS",
    # Documentation
    "SPECTACULAR_SETTINGS",
    # Proxy APIs
    "PROXY_API",
]
