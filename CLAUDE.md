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

# Run with verbosity
python manage.py test --verbosity=2
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
  - `database.py` - Database configuration
  - `jwt.py` - JWT authentication settings
  - `cors.py` - CORS configuration
  - `cache.py` - Redis/cache configuration
  - `proxy.py` - External API configurations
  - `rest_framework.py` - DRF settings
  - `static.py` - Static file configuration
  - `docs.py` - API documentation settings

### Proxy API Client Architecture

The proxy app uses a **layered client pattern**:

```
BaseAPIClient (abstract)
  ↓
CachedAPIClient (adds caching + token management)
  ↓
TMDBClient, SpotifyClient, IGDBClient, OpenLibraryClient
```

**Key Concepts:**

1. **BaseAPIClient** (`proxy/clients/base.py`)
   - Generic HTTP methods with timeout/header management
   - Error handling with ErrorCode dataclass

2. **CachedAPIClient** (`proxy/clients/cached.py`)
   - Redis caching layer with configurable timeouts
   - Automatic token management for OAuth2 APIs (IGDB, Spotify)
   - Cache key generation from templates in `settings.CACHE_KEYS`

3. **Specific Clients** (tmdb.py, spotify.py, igdb.py, openlibrary.py)
   - Implement API-specific authentication
   - Cache timeouts defined in `settings.CACHE_TIMEOUTS`
   - Operation-specific timeouts from `settings.API_TIMEOUTS`

**Authentication Patterns:**
- **TMDB**: Bearer token authentication
- **IGDB**: OAuth2 with Twitch (token auto-refresh)
- **Spotify**: OAuth2 Client Credentials (token auto-refresh)
- **OpenLibrary**: User-Agent string only

### Data Flow Pattern

```
Frontend Request
  ↓
Django View (proxy/views/)
  ↓
API Client (proxy/clients/)
  ↓
[Check Cache] → Cache hit? Return cached data
  ↓
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

**Mappers** (`proxy/mappers/`) transform external API responses to internal models:
- `TMDBMapper`: Converts TMDB responses, handles image URLs, normalizes providers
- Similar mappers for other APIs

**Models** (`proxy/models/`) use Python `@dataclass` (NOT Django models):
- `Movie`, `TVShow`, `Season`, `Episode` (video.py)
- `Game`, `Album`, `Book` (other model files)
- `Provider`, `Images` (common structures)

This design allows flexibility without database constraints since proxy data is ephemeral.

## Key Design Patterns

### 1. Settings Configuration
- All external API configurations centralized in `core/settings/proxy.py`
- Use `settings.PROXY_API["TMDB"]` to access TMDB config
- Cache keys defined in `settings.CACHE_KEYS`
- Timeouts defined in `settings.API_TIMEOUTS` and `settings.CACHE_TIMEOUTS`

### 2. Caching Strategy
```python
# Cache timeouts (from settings.CACHE_TIMEOUTS)
'api:searches': 6 hours
'api:details': 24 hours
'api:external_ids': 14 days
'api:watch_providers': 14 days
'homepage': 12 hours
```

### 3. Error Handling
- Use `ErrorCode` dataclass from `proxy/errors.py` for standardized errors
- Custom exception handler in `core/exceptions.py`
- Never expose internal errors or API keys to clients

### 4. Bulk Operations
- Use `ThreadPoolExecutor` with 10 workers (see `TMDBClient.get_bulk_movies()`)
- Operation-specific timeouts for bulk endpoints

### 5. Permissions
Custom permission classes in `content/permissions.py`:
- `IsMemberOfList` - Check if user is in shared list
- `IsOwnerOfRating` - Verify rating ownership
- `IsOwnerOfSharedList` - Verify list ownership

## Database Models

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
from .cached import CachedAPIClient

class NewAPIClient(CachedAPIClient):
    def __init__(self):
        super().__init__(
            base_url=settings.PROXY_API["NEWAPI"]["BASE_URL"],
            default_headers={"Authorization": f"Bearer {settings.PROXY_API['NEWAPI']['API_KEY']}"}
        )
```

2. **Add configuration** in `core/settings/proxy.py`:
```python
NEWAPI_CONFIG = {
    "API_KEY": os.getenv("NEWAPI_KEY"),
    "BASE_URL": "https://api.newapi.com/v1",
}

PROXY_API = {
    # ... existing configs
    "NEWAPI": NEWAPI_CONFIG,
}
```

3. **Create views** in `proxy/views/new_api/`:
```python
class NewAPIView(APIView):
    def get(self, request):
        client = NewAPIClient()
        # ... implement logic
```

4. **Register URLs** in `proxy/urls/`:
```python
urlpatterns = [
    path('newapi/', include('proxy.urls.new_api')),
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

1. **Always use caching** for expensive operations:
```python
def get_movie(self, movie_id: str) -> dict:
    cache_key = settings.CACHE_KEYS['api:movie:details'].format(movie_id=movie_id)
    timeout = settings.CACHE_TIMEOUTS['api:details']
    operation_timeout = settings.API_TIMEOUTS['tmdb']['details']

    return self.cached_get(
        f'/movie/{movie_id}',
        cache_key=cache_key,
        timeout=timeout,
        operation_timeout=operation_timeout
    )
```

2. **Handle token refresh** for OAuth2 APIs (see `CachedAPIClient._ensure_valid_token()`)

3. **Use mappers** to transform external responses before serialization

4. **Set operation-specific timeouts** in `settings.API_TIMEOUTS`

### Working with Content Models

When working with UserList and ListItem:

1. **List membership**: Always check `IsMemberOfList` permission for shared lists
2. **Ordering**: ListItem.list_order is auto-managed; use custom reorder actions if needed
3. **Ratings**: Updates are automatically propagated to ContentItem.average_rating

### Working with Serializers

Use `@extend_schema` decorator for API documentation:
```python
from drf_spectacular.utils import extend_schema

@extend_schema(
    summary="Search for movies",
    description="Search TMDB for movies by query string",
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

## Current Branch: feature/proxy-v2

Working on proxy refactoring with enhanced video endpoint responses including:
- External IDs (IMDB, etc.)
- Watch provider data with country filtering
- Enhanced image handling
- Provider normalization by country
