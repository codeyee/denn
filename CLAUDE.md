# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Denn API is a Django-based secure API gateway for managing multi-media content. It acts as a proxy for external APIs (TMDB, IGDB, Spotify, OpenLibrary), hiding API keys from frontend applications while providing a unified interface for movies, TV shows, games, music, and books.

## Development Commands

### Environment Setup
```bash
# Create and activate virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables (create .env file first)
# Required: SECRET_KEY, TMDB_API_KEY, IGDB_CLIENT_ID, IGDB_CLIENT_SECRET,
#           SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, OPENLIBRARY_USER_AGENT
```

### Database Management
```bash
# Run migrations
python manage.py migrate

# Create migrations after model changes
python manage.py makemigrations

# Check migration status
python manage.py showmigrations

# Create superuser for admin access
python manage.py createsuperuser

# Access Django shell
python manage.py shell
```

### Running the Server
```bash
# Development server
python manage.py runserver

# Run on specific port
python manage.py runserver 8080

# Run on all interfaces (for Docker/Railway)
python manage.py runserver 0.0.0.0:8000

# Production server (using Gunicorn)
gunicorn core.wsgi:application
```

### Testing
```bash
# Run all tests
python manage.py test

# Run tests for specific app
python manage.py test authentication
python manage.py test content
python manage.py test proxy

# Run specific test file
python manage.py test authentication.tests.test_views

# Run specific test class or method
python manage.py test authentication.tests.test_views.TestClassName
python manage.py test authentication.tests.test_views.TestClassName.test_method_name

# Run with verbosity
python manage.py test --verbosity=2

# Run with warnings
python manage.py test --debug-mode
```

### Cache Management
```bash
# Clear all cache (Django shell)
python manage.py shell
>>> from django.core.cache import cache
>>> cache.clear()

# Or using django-redis (if Redis is configured)
python manage.py shell
>>> from django_redis import get_redis_connection
>>> get_redis_connection("default").flushall()
```

### API Documentation
```bash
# Access Swagger UI: http://localhost:8000/api/swagger/
# Access ReDoc: http://localhost:8000/api/docs/
# Download OpenAPI schema: http://localhost:8000/api/schema/
```

## Architecture Overview

### Django Apps Structure

**`authentication/`** - JWT-based user authentication
- Custom registration with email-based login
- Token rotation and blacklist on logout
- Access token: 5 hours, Refresh token: 7 days

**`content/`** - User-generated content management
- **Models**: ContentItem (external media reference), UserList (collections), ListItem (items in lists), Rating (user ratings), ListInvitation (sharing)
- Supports personal and shared lists with multiple members
- Rating aggregation cached on ContentItem
- Automatic list ordering and completion tracking

**`proxy/`** - External API integration layer (core feature)
- Hides API keys from frontend
- Unified response format across different external APIs
- Built-in caching (Redis with LocalMemCache fallback)
- Bulk operations with concurrent requests (ThreadPoolExecutor, 10 workers)

**`core/`** - Project settings and configuration
- Modular settings files in `core/settings/`:
  - `base.py` - Django core settings
  - `db.py` - Database configuration
  - `jwt.py` - JWT authentication settings
  - `cors.py` - CORS configuration
  - `cache.py` - Redis/cache configuration and cache key templates
  - `drf.py` - DRF settings
  - `static.py` - Static file configuration
  - `docs.py` - API documentation settings

### Proxy API Client Architecture

The proxy app uses a **layered client pattern** with inheritance:

```
Client Hierarchy
├── TMDBClient (proxy/clients/tmdb.py)
├── SpotifyClient (proxy/clients/spotify.py)
├── IGDBClient (proxy/clients/igdb.py)
└── OpenLibraryClient (proxy/clients/openlibrary.py)
```

**Key Concepts:**

1. **Client Layer** (`proxy/clients/`)
   - Each client handles API-specific authentication and endpoints
   - Uses `requests` library for HTTP operations
   - Error handling with structured responses
   - Operation-specific timeouts from settings

2. **Caching Strategy**
   - Redis caching layer with configurable timeouts
   - Automatic token management for OAuth2 APIs (IGDB, Spotify)
   - Cache key templates defined in `settings.CACHE_KEYS`
   - Cache timeouts defined in `settings.CACHE_TIMEOUTS`
   - Fallback to LocalMemCache when Redis unavailable

3. **Authentication Patterns:**
   - **TMDB**: Bearer token authentication (API key in headers)
   - **IGDB**: OAuth2 with Twitch (token auto-refresh via client credentials)
   - **Spotify**: OAuth2 Client Credentials (token auto-refresh)
   - **OpenLibrary**: User-Agent string only (no authentication)

### Data Flow Pattern

```
Frontend Request
  ↓
Django View (proxy/views/)
  ↓
API Client (proxy/clients/)
  ↓
[Check Cache] → Cache hit? Return cached data
  ↓ (Cache miss)
External API Request
  ↓
Mapper (proxy/mappers/) - Transform response
  ↓
Dataclass Model (proxy/models/) - Structured data
  ↓
Serializer (proxy/serializers/) - JSON response
  ↓
Response to Frontend
```

### Mappers and Models

**Important:** Proxy models (`proxy/models/`) use Python `@dataclass`, NOT Django ORM models. This is intentional because proxy data is ephemeral (cached but not persisted to database).

**Mappers** (`proxy/mappers/`) transform external API responses to internal dataclass models:
- `TMDBMapper`: Converts TMDB responses, handles image URLs, normalizes providers
- `SpotifyMapper`: Transforms Spotify album/track data
- `IGDBMapper`: Processes game data from IGDB
- `OpenLibraryMapper`: Converts book information

**Models** (`proxy/models/`) as dataclasses:
- `Movie`, `TVShow`, `Season`, `Episode` (video models)
- `Game` (gaming)
- `Album`, `Track` (music)
- `Book` (literature)
- `Provider`, `Images`, `ExternalIds` (common structures)

This design provides flexibility without database constraints and allows rapid response format changes.

## Key Design Patterns

### 1. Settings Configuration
- All configurations centralized in modular `core/settings/` files
- External API configs accessed via environment variables
- Cache keys defined as templates in `settings.CACHE_KEYS`
- Timeouts defined in `settings.CACHE_TIMEOUTS`
- Settings imported via `core/settings/__init__.py`

### 2. Caching Strategy
Cache timeouts (from `settings.CACHE_TIMEOUTS`):
```python
'homepage': 24 hours
'api_tmdb_search': 24 hours
'api_tmdb_details': 48 hours
'api_tmdb_external_ids': 30 days
'api_tmdb_watch_providers': 30 days
'api_igdb_search': 24 hours
'api_spotify_search': 24 hours
'api_openlibrary_search': 24 hours
```

Cache key patterns use `.format()` for dynamic values:
```python
CACHE_KEYS = {
    'api_tmdb_details': 'api:tmdb:details:{movie_id}',
    'api_tmdb_search': 'api:tmdb:search:{query}:{page}',
}
```

### 3. Error Handling
- Custom exception handler in `core/exceptions.py`
- Structured error responses from API clients
- Never expose internal errors or API keys to clients
- HTTP status codes follow REST conventions

### 4. Bulk Operations
- Use `concurrent.futures.ThreadPoolExecutor` for parallel requests
- See client implementations for bulk methods (e.g., `get_bulk_movies()`)
- Operation-specific timeouts prevent hanging requests

### 5. Permissions
Custom permission classes in `content/permissions.py`:
- `IsMemberOfList` - Check if user is in shared list
- `IsOwnerOfRating` - Verify rating ownership
- `IsOwnerOfSharedList` - Verify list ownership

## Database Models (Content App)

### ContentItem
- **Purpose**: Reference to external media (movies, games, albums, books)
- **Unique constraint**: (source_api, external_id, content_type)
- **Cached fields**: rating_count, average_rating
- **Source APIs**: 'tmdb', 'igdb', 'spotify', 'openlibrary'

### UserList
- **Types**: PERSONAL (private), SHARED (collaborative)
- **Relationships**: owner (User), members (ManyToMany with User)
- **Auto-behavior**: Owner automatically added to members on shared lists

### ListItem
- **Ordering**: Auto-incremented list_order per UserList
- **Status**: PENDING, COMPLETED (with completion timestamp)
- **Relationships**: user_list (UserList), content_item (ContentItem), added_by (User)

### Rating
- **Score range**: 0.5 to 10.0 (step 0.5)
- **Unique constraint**: One rating per user per content item
- **Auto-behavior**: Updates ContentItem.average_rating on save

## Adding New Features

### Adding a New External API

1. **Create client** in `proxy/clients/new_api.py`:
```python
import os
import requests
from typing import Optional

class NewAPIClient:
    def __init__(self):
        self.base_url = "https://api.newapi.com/v1"
        self.api_key = os.getenv("NEWAPI_KEY")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}"
        })

    def search(self, query: str) -> dict:
        # Implement with caching pattern
        pass
```

2. **Add environment variable** to `.env`:
```env
NEWAPI_KEY=your_api_key_here
```

3. **Create mapper** in `proxy/mappers/new_api.py`:
```python
from typing import Dict, Any
from ..models.new_item import NewItem

class NewAPIMapper:
    @staticmethod
    def map_item(data: Dict[str, Any]) -> NewItem:
        return NewItem(
            id=data.get('id'),
            name=data.get('name'),
            # ... map other fields
        )
```

4. **Create dataclass model** in `proxy/models/new_item.py`:
```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class NewItem:
    id: str
    name: str
    description: Optional[str] = None
```

5. **Create serializer** in `proxy/serializers/new_item.py`:
```python
from rest_framework import serializers

class NewItemSerializer(serializers.Serializer):
    id = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField(required=False)
```

6. **Create views** in `proxy/views/new_api/`:
```python
from rest_framework.views import APIView
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from ...clients.new_api import NewAPIClient

class NewAPISearchView(APIView):
    @extend_schema(
        summary="Search NewAPI",
        description="Search for items in NewAPI"
    )
    def get(self, request):
        client = NewAPIClient()
        # ... implement logic
        return Response(data)
```

7. **Register URLs** in `proxy/urls/`:
```python
from django.urls import path
from .views.new_api import NewAPISearchView

urlpatterns = [
    path('newapi/search/', NewAPISearchView.as_view(), name='newapi-search'),
]
```

### Adding Models to Content App

1. Define model in appropriate file under `content/models/`
2. Create serializer in `content/serializers/`
3. Create viewset in `content/views/`
4. Register in `content/urls.py`
5. Run migrations: `python manage.py makemigrations && python manage.py migrate`

## Environment Variables

Required for development:
```
SECRET_KEY=your-secret-key
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1

# Database (PostgreSQL for production, SQLite for dev)
PGDATABASE=denn_api
PGUSER=postgres
PGPASSWORD=password
PGHOST=localhost
PGPORT=5432

# External APIs
TMDB_API_KEY=your_tmdb_key
IGDB_CLIENT_ID=your_igdb_id
IGDB_CLIENT_SECRET=your_igdb_secret
SPOTIFY_CLIENT_ID=your_spotify_id
SPOTIFY_CLIENT_SECRET=your_spotify_secret
OPENLIBRARY_USER_AGENT=DennAPI/1.0 (your-email@example.com)

# CORS (comma-separated)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Redis (optional, falls back to LocalMemCache)
REDIS_URL=redis://localhost:6379/0
```

## Common Development Patterns

### Working with External API Clients

When implementing or modifying external API integrations:

1. **Use caching for all API calls**:
```python
from django.core.cache import cache
from django.conf import settings

def get_movie(self, movie_id: str) -> dict:
    # Build cache key from template
    cache_key = settings.CACHE_KEYS['api_tmdb_details'].format(movie_id=movie_id)
    timeout = settings.CACHE_TIMEOUTS['api_tmdb_details']

    # Check cache first
    cached_data = cache.get(cache_key)
    if cached_data:
        return cached_data

    # Make API request
    response = self.session.get(f'/movie/{movie_id}', timeout=10)
    data = response.json()

    # Cache result
    cache.set(cache_key, data, timeout)
    return data
```

2. **Handle OAuth2 token refresh** for APIs requiring it (see IGDB/Spotify clients)

3. **Use mappers** to transform external responses before returning to views

4. **Set appropriate timeouts** to prevent hanging requests

### Working with Content Models

When working with UserList and ListItem:

1. **List membership**: Always check `IsMemberOfList` permission for shared lists
2. **Ordering**: ListItem.list_order is auto-managed; use custom actions for reordering
3. **Ratings**: Updates automatically propagate to ContentItem.average_rating via signals

### Working with Serializers

Use `@extend_schema` decorator for API documentation:
```python
from drf_spectacular.utils import extend_schema, OpenApiParameter

@extend_schema(
    summary="Search for movies",
    description="Search TMDB for movies by query string",
    parameters=[
        OpenApiParameter(name='query', description='Search query', required=True, type=str),
        OpenApiParameter(name='page', description='Page number', required=False, type=int),
    ],
    responses={200: MovieSerializer(many=True)}
)
def get(self, request):
    # implementation
```

## Deployment

The project is production-ready for Railway platform:
- Automatic migrations via Railway deployment hooks
- PostgreSQL support with fallback to SQLite
- Gunicorn configured for production
- Whitenoise for static file serving
- Health check endpoint at `/`
- Railway-specific environment detection in settings
