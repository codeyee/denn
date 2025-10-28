SWAGGER_UI_SETTINGS = {
    'deepLinking': True,
    'persistAuthorization': True,
    'displayOperationId': False,
    'defaultModelsExpandDepth': 2,
    'defaultModelExpandDepth': 2,
    'displayRequestDuration': True,
    'filter': True
}

REDOC_UI_SETTINGS = {
    'hideDownloadButton': False,
    'expandResponses': '200,201',
    'pathInMiddlePanel': True,
    'theme': {
        'colors': {
            'primary': {
                'main': '#6366f1'
            }
        },
        'typography': {
            'fontSize': '15px',
            'lineHeight': '1.6',
            'fontFamily': '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
            'headings': {
                'fontFamily': '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                'fontWeight': '600'
            }
        },
        'sidebar': {
            'backgroundColor': '#1f2937',
            'textColor': '#f3f4f6',
            'activeTextColor': '#ffffff',
            'groupItems': {
                'textTransform': 'none'
            }
        },
        'rightPanel': {
            'backgroundColor': '#111827',
            'textColor': '#f3f4f6'
        },
        'codeBlock': {
            'backgroundColor': '#0f172a',
        }
    }
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Denn API',
    'DESCRIPTION': '''
    # Denn API - Complete Media Management Platform

    A comprehensive API for managing movies, TV shows, music, games, and books.

    ## Features
    - 🔐 **Authentication**: User registration, login, and JWT-based authentication
    - 📝 **Lists Management**: Create personal or shared lists of media content
    - ⭐ **Ratings**: Rate and review content
    - 👥 **Social Features**: Invite users to shared lists, collaborate on collections
    - 🔄 **Proxy APIs**: Unified interface to TMDB, Spotify, IGDB, and OpenLibrary

    ## Authentication
    Most endpoints require JWT authentication. Include the token in the Authorization header:
    ```
    Authorization: Bearer <your_access_token>
    ```

    ## Proxy Endpoints
    Proxy endpoints provide a unified interface to various external media APIs without exposing API keys.
    No authentication required for proxy endpoints (for now).
    ''',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
    'SCHEMA_PATH_PREFIX': '/api',
    'SERVERS': [
        {'url': 'http://localhost:8000', 'description': 'Development server'},
    ],
    'TAGS': [
        {'name': 'Authentication', 'description': 'User authentication and registration'},
        {'name': 'Lists', 'description': 'User lists management'},
        {'name': 'List Items', 'description': 'Items within lists'},
        {'name': 'List Members', 'description': 'Manage list members for shared lists'},
        {'name': 'List Invitations', 'description': 'Invite users to shared lists'},
        {'name': 'Ratings', 'description': 'Rate and review content'},
        {'name': 'Invitations', 'description': 'Global invitations management'},
        {'name': 'Proxy - Video', 'description': 'Movies and TV Shows (TMDB)'},
        {'name': 'Proxy - Music',
            'description': 'Music albums and tracks (Spotify)'},
        {'name': 'Proxy - Games', 'description': 'Video games (IGDB)'},
        {'name': 'Proxy - Books', 'description': 'Books (OpenLibrary)'},
    ],
    'CONTACT': {
        'name': 'Denn API Support',
        'email': 'denn@codeyee.dev',
    },
    'LICENSE': {
        'name': 'MIT',
    },
    'SECURITY': [
        {
            'bearerAuth': []
        }
    ],
    'COMPONENTS': {
        'securitySchemes': {
            'bearerAuth': {
                'type': 'http',
                'scheme': 'bearer',
                'bearerFormat': 'JWT',
            }
        }
    },
    'SWAGGER_UI_SETTINGS': SWAGGER_UI_SETTINGS,
    'REDOC_UI_SETTINGS': REDOC_UI_SETTINGS,
    'PREPROCESSING_HOOKS': [
        'core.schema_hooks.preprocess_authentication_tags',
    ],
    'POSTPROCESSING_HOOKS': [
        'core.schema_hooks.preprocess_spectacular_schema',
    ],
    'ENUM_NAME_OVERRIDES': {
        'ListTypeEnum': 'content.models.user_list.UserList.ListType',
        'StatusEnum': 'content.models.list_item.ListItem.Status',
        'ContentTypeEnum': 'content.models.content_item.ContentItem.ContentType',
        'SourceAPIEnum': 'content.models.content_item.ContentItem.SourceAPI',
    },
}
