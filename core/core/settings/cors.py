import os
import re

from corsheaders.defaults import default_headers

CORS_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "")
CORS_ALLOWED_ORIGINS = [
    origin.strip().rstrip("/") for origin in CORS_ORIGINS.split(",") if origin.strip()
]

if os.getenv("DISABLE_LOCALHOST_CORS", "False").lower() != "true":
    CORS_ALLOWED_ORIGIN_REGEXES = [
        re.compile(r"^http://localhost:\d+$"),
        re.compile(r"^http://127\.0\.0\.1:\d+$"),
        re.compile(r"^http://\[::1\]:\d+$"),
    ]
else:
    CORS_ALLOWED_ORIGIN_REGEXES = []

CORS_ALLOW_CREDENTIALS = True

# `django-cors-headers` only honours `CORS_ALLOW_HEADERS` (there is no
# `CORS_ALLOW_ALL_HEADERS`). Without explicit entries, the browser blocks
# preflight for any custom header the SPA sends (e.g. `X-Request-Id` from
# the internal HTTP contract).
CORS_ALLOW_HEADERS = tuple(default_headers) + (
    "x-request-id",
    "x-user-country",
)

# Let client-side `fetch` read correlation headers on credentialed responses.
CORS_EXPOSE_HEADERS = (
    "x-request-id",
    "x-ratelimit-limit",
    "x-ratelimit-remaining",
    "x-ratelimit-degraded",
)

# CSRF Configuration
CSRF_TRUSTED_ORIGINS = []

if os.getenv("DISABLE_LOCALHOST_CSRF", "False").lower() != "true":
    common_dev_ports = (
        list(range(3000, 3010)) +
        list(range(5173, 5180)) +
        list(range(8000, 8010)) +
        list(range(8080, 8090)) +
        list(range(5000, 5010)) +
        list(range(4000, 4010)) +
        list(range(9000, 9010))
    )
    for port in common_dev_ports:
        CSRF_TRUSTED_ORIGINS.extend([
            f"http://localhost:{port}",
            f"http://127.0.0.1:{port}",
        ])

if os.getenv("RAILWAY_PUBLIC_DOMAIN"):
    railway_domain = os.getenv("RAILWAY_PUBLIC_DOMAIN")
    CSRF_TRUSTED_ORIGINS.append(f"https://{railway_domain}")

if os.getenv("RAILWAY_ENVIRONMENT"):
    CSRF_TRUSTED_ORIGINS.extend([
        "https://*.railway.app",
        "https://*.up.railway.app",
    ])

csrf_origins_env = os.getenv("CSRF_TRUSTED_ORIGINS", "")
if csrf_origins_env:
    CSRF_TRUSTED_ORIGINS.extend([
        origin.strip() for origin in csrf_origins_env.split(",") if origin.strip()
    ])
