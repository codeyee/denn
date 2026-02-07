REST_FRAMEWORK = {
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework_simplejwt.authentication.JWTAuthentication",
        "rest_framework.authentication.SessionAuthentication",
    ],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.IsAuthenticated"],
    "DEFAULT_PAGINATION_CLASS": "core.pagination.CustomPageNumberPagination",
    "EXCEPTION_HANDLER": "core.exceptions.custom_exception_handler",
    "PAGE_SIZE": 20,
    "TIMEOUT": 30,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",

    # Rate limiting / Throttling
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],

    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",       # Anonymous users: 100 requests/day
        "user": "1000/day",      # Authenticated users: 1000 requests/day
        "auth": "5/minute",      # Auth endpoints: 5 requests/minute
        "password_reset": "3/hour",  # Password reset: 3 requests/hour
        "bulk": "10/minute",     # Bulk operations: 10 requests/minute
    },
}

# dj-rest-auth configuration
REST_AUTH = {
    "USE_JWT": True,
    "JWT_AUTH_COOKIE": "auth-token",
    "JWT_AUTH_REFRESH_COOKIE": "refresh-token",
    "JWT_AUTH_HTTPONLY": False,
    "USER_DETAILS_SERIALIZER": "authentication.serializers.ProfileSerializer",
    "LOGIN_SERIALIZER": "authentication.serializers.EmailLoginSerializer",
    "SESSION_LOGIN": False,
}
