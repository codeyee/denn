import os

# CORS Configuration
CORS_ORIGINS = os.getenv("CORS_ALLOWED_ORIGINS", "")
CORS_ALLOWED_ORIGINS = [
    origin.strip() for origin in CORS_ORIGINS.split(",") if origin.strip()
]

# Local development origins
CORS_ALLOWED_ORIGINS.extend([
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
])

CORS_ALLOW_CREDENTIALS = True

# CSRF Configuration
CSRF_TRUSTED_ORIGINS = []

# Local development CSRF trusted origins
CSRF_TRUSTED_ORIGINS.extend([
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
])

# Railway platform CSRF trusted origins
if os.getenv("RAILWAY_PUBLIC_DOMAIN"):
    railway_domain = os.getenv("RAILWAY_PUBLIC_DOMAIN")
    CSRF_TRUSTED_ORIGINS.append(f"https://{railway_domain}")

if os.getenv("RAILWAY_ENVIRONMENT"):
    CSRF_TRUSTED_ORIGINS.extend([
        "https://*.railway.app",
        "https://*.up.railway.app",
    ])

# Additional CSRF trusted origins from environment
csrf_origins_env = os.getenv("CSRF_TRUSTED_ORIGINS", "")
if csrf_origins_env:
    CSRF_TRUSTED_ORIGINS.extend([
        origin.strip() for origin in csrf_origins_env.split(",") if origin.strip()
    ])
