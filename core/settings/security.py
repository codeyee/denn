import os
from .base import DEBUG

SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

if not DEBUG:
    # Redirect all HTTP requests to HTTPS
    SECURE_SSL_REDIRECT = True

    # Use secure cookies for session
    SESSION_COOKIE_SECURE = True

    # Use secure cookies for CSRF
    CSRF_COOKIE_SECURE = True

    # HTTP Strict Transport Security (HSTS)
    # Forces browsers to use HTTPS for 1 year
    SECURE_HSTS_SECONDS = 31536000  # 1 year

    # Apply HSTS to all subdomains
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True

    # Allow browser HSTS preloading
    SECURE_HSTS_PRELOAD = True

    # Secure proxy SSL header (for Railway, Heroku, etc.)
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Session cookie settings
SESSION_COOKIE_HTTPONLY = True  # Prevent JavaScript access to session cookie
SESSION_COOKIE_SAMESITE = 'Lax'  # CSRF protection via SameSite
SESSION_COOKIE_AGE = 3600 * 24 * 7  # 7 days

# Session engine (using database-backed sessions for security)
SESSION_ENGINE = 'django.contrib.sessions.backends.db'

# CSRF cookie settings
CSRF_COOKIE_HTTPONLY = True  # Prevent JavaScript access to CSRF cookie
CSRF_COOKIE_SAMESITE = 'Lax'  # Additional CSRF protection

# CSRF trusted origins (set via environment variable in production)
# Must start with scheme (http:// or https://) as of Django 4.0
csrf_origins = os.getenv('CSRF_TRUSTED_ORIGINS', '')
CSRF_TRUSTED_ORIGINS = [origin for origin in csrf_origins.split(',') if origin]

# Prevent host header injection
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')

# File upload settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 5242880  # 5 MB

# DRF Throttling classes
# Applied globally via REST_FRAMEWORK settings in drf.py
THROTTLE_RATES = {
    # Anonymous users: 100 requests per day
    'anon': '100/day',

    # Authenticated users: 1000 requests per day
    'user': '1000/day',

    # Burst rate for sensitive endpoints (login, register, password reset)
    'auth': '5/minute',

    # Burst rate for password reset to prevent abuse
    'password_reset': '3/hour',

    # Rate limit for bulk operations
    'bulk': '10/minute',
}