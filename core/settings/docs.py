API_NAME = "Denn API"
API_VERSION = "1.0.0"

# Tags
SPECTACULAR_TAGS = [
    {"name": "Authentication", "description": "User authentication and registration"},
    {"name": "Lists", "description": "User lists management"},
    {"name": "List Items", "description": "Items within lists"},
    {"name": "List Members", "description": "Manage list members for shared lists"},
    {"name": "List Invitations", "description": "Invite users to shared lists"},
    {"name": "Ratings", "description": "Rate and review content"},
    {"name": "Content Items", "description": "Content items management"},
    {"name": "Proxy - Suggestions", "description": "Homepage suggestions"},
    {"name": "Proxy - Video", "description": "Movies and TV Shows (TMDB)"},
    {"name": "Proxy - Music", "description": "Music albums and tracks (Spotify)"},
    {"name": "Proxy - Games", "description": "Video games (IGDB)"},
    {"name": "Proxy - Books", "description": "Books (OpenLibrary)"},
    {"name": "API Schema", "description": "OpenAPI schema endpoints"}
]

# Swagger UI Configuration
SWAGGER_UI_SETTINGS = {
    "deepLinking": True,
    "persistAuthorization": True,
    "displayOperationId": False,
    "defaultModelsExpandDepth": 2,
    "defaultModelExpandDepth": 2,
    "displayRequestDuration": True,
    "filter": True,
}

# ReDoc UI Configuration
REDOC_UI_SETTINGS = {
    "hideDownloadButton": False,
    "expandResponses": "200,201",
    "pathInMiddlePanel": True,
    "theme": {
        "colors": {
            "primary": {"main": "#6366f1"}
        },
        "typography": {
            "fontSize": "15px",
            "lineHeight": "1.6",
            "fontFamily": '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            "headings": {
                "fontFamily": '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                "fontWeight": "600",
            },
        },
        "sidebar": {
            "backgroundColor": "#1f2937",
            "textColor": "#f3f4f6",
            "activeTextColor": "#ffffff",
            "groupItems": {"textTransform": "none"},
        },
        "rightPanel": {
            "backgroundColor": "#111827",
            "textColor": "#f3f4f6",
        },
        "codeBlock": {
            "backgroundColor": "#0f172a",
        },
    },
}

# Enum name overrides for better OpenAPI schema generation
ENUM_NAME_OVERRIDES = {
    "ListTypeEnum": "content.models.user_list.UserList.ListType",
    "StatusEnum": "content.models.list_item.ListItem.Status",
    "ContentTypeEnum": "content.models.content_item.ContentItem.ContentType",
    "SourceAPIEnum": "content.models.content_item.ContentItem.SourceAPI",
}

# Hooks
PREPROCESSING_HOOKS = ["core.hooks.preprocess_authentication_tags"]
POSTPROCESSING_HOOKS = ["core.hooks.preprocess_spectacular_schema"]

# Security configuration
SECURITY_DEFINITIONS = [{"bearerAuth": []}]

SECURITY_COMPONENTS = {
    "securitySchemes": {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }
}

# Spectacular main configuration
SPECTACULAR_SETTINGS = {
    "TITLE": API_NAME,
    "VERSION": API_VERSION,
    "TAGS": SPECTACULAR_TAGS,
    "SECURITY": SECURITY_DEFINITIONS,
    "COMPONENTS": SECURITY_COMPONENTS,
    "SWAGGER_UI_SETTINGS": SWAGGER_UI_SETTINGS,
    "REDOC_UI_SETTINGS": REDOC_UI_SETTINGS,
    "PREPROCESSING_HOOKS": PREPROCESSING_HOOKS,
    "POSTPROCESSING_HOOKS": POSTPROCESSING_HOOKS,
    "ENUM_NAME_OVERRIDES": ENUM_NAME_OVERRIDES,
}
