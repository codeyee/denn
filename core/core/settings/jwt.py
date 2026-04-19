from datetime import timedelta
from .base import SECRET_KEY

SIMPLE_JWT = {
    # Security improvement: Reduced access token lifetime from 2 days to 1 hour
    # Short-lived access tokens reduce the window of vulnerability if compromised
    "ACCESS_TOKEN_LIFETIME": timedelta(hours=1),

    # Refresh token lifetime: 7 days (reduced from 14 for better security)
    # Users will need to re-authenticate weekly
    "REFRESH_TOKEN_LIFETIME": timedelta(days=7),

    # Token rotation: Generate new refresh token on each refresh request
    # Prevents token reuse and limits impact of stolen refresh tokens
    "ROTATE_REFRESH_TOKENS": True,

    # Blacklist old tokens after rotation to prevent reuse
    "BLACKLIST_AFTER_ROTATION": True,

    # Update last_login timestamp on token refresh
    "UPDATE_LAST_LOGIN": True,

    # HMAC-SHA256 algorithm for token signing
    "ALGORITHM": "HS256",

    # Secret key for signing tokens (from base settings)
    "SIGNING_KEY": SECRET_KEY,

    # Accept only "Bearer" authentication scheme
    "AUTH_HEADER_TYPES": ("Bearer",),

    # HTTP header name for authorization
    "AUTH_HEADER_NAME": "HTTP_AUTHORIZATION",

    # User model field used as unique identifier
    "USER_ID_FIELD": "id",

    # Claim name for user ID in token payload
    "USER_ID_CLAIM": "user_id",

    # Token classes accepted for authentication
    "AUTH_TOKEN_CLASSES": ("rest_framework_simplejwt.tokens.AccessToken",),

    # Claim for token type differentiation
    "TOKEN_TYPE_CLAIM": "token_type",

    # Enable JTI (JWT ID) claim for token tracking and revocation
    "JTI_CLAIM": "jti",

    # Sliding token settings (optional, for future use)
    # "SLIDING_TOKEN_REFRESH_LIFETIME": timedelta(days=1),
    # "SLIDING_TOKEN_LIFETIME": timedelta(hours=1),
}
