# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Denn Core API is a Django-based backend for managing multi-media content (movies, TV shows, games, music, and books). It handles user authentication, content lists, ratings, and invitations. External media data (TMDB, IGDB, Spotify, OpenLibrary) is fetched from a separate **Go proxy microservice** via HTTP calls.

## Development Commands

### Environment Setup
```bash
# Quick start (automated setup script)
./quick_start.sh

# Or manual setup:
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables (create .env file first)
# Required: SECRET_KEY, PROXY_API_BASE_URL, PROXY_API_KEY
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
./.venv/bin/python manage.py test

# Run tests for specific app
./.venv/bin/python manage.py test authentication
./.venv/bin/python manage.py test content

# Run specific test file
./.venv/bin/python manage.py test authentication.tests.test_views

# Run specific test class or method
./.venv/bin/python manage.py test authentication.tests.test_views.TestClassName
./.venv/bin/python manage.py test authentication.tests.test_views.TestClassName.test_method_name

# Run with verbosity
./.venv/bin/python manage.py test --verbosity=2

# Run with warnings
./.venv/bin/python manage.py test --debug-mode
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
- **Services**: `ProxyAPIClient` (`content/services/proxy_client.py`) — HTTP client for the Go proxy microservice
- Supports personal and shared lists with multiple members
- Rating aggregation cached on ContentItem
- Automatic list ordering and completion tracking

**`core/`** - Project settings and configuration
- Modular settings files in `core/settings/`:
  - `base.py` - Django core settings + proxy API config (`PROXY_API_BASE_URL`, `PROXY_API_KEY`)
  - `db.py` - Database configuration
  - `jwt.py` - JWT authentication settings
  - `cors.py` - CORS configuration
  - `cache.py` - Redis/cache configuration
  - `drf.py` - DRF settings
  - `static.py` - Static file configuration
  - `docs.py` - API documentation settings
- Key utilities:
  - `cache_utils.py` - `@cached_view` decorator for DRF views with query-param-aware cache keys
  - `pagination.py` - `CustomPageNumberPagination` (supports `unpaginated=true` to bypass pagination)
  - `error_codes.py` - Centralized `ErrorCode` dataclass definitions with HTTP status mappings
  - `exceptions.py` - Custom exception classes (TimeoutException, ConnectionErrorException, etc.)

### External Data: Go Proxy Microservice

External media metadata is handled by a separate Go microservice. This Django app communicates with it via `ProxyAPIClient`:

```
content/services/proxy_client.py  →  Go Proxy API (PROXY_API_BASE_URL)
                                          ↓
                                   TMDB, IGDB, Spotify, OpenLibrary
```

**Base path**: `/v1/proxy/`
**Authentication**: API key via `X-Api-Key` header
**Country**: Passed as `X-User-Country` header (not query param)
**Search**: `GET /movies?q=...` (query param is `q`, no `/search` sub-path)
**Bulk operations**: `GET /movies/bulk?ids=1,2,3` (GET with query string IDs)
**TV Shows**: Uses kebab-case paths (`/tv-shows/`) and response keys (`tv-shows`)

### Data Flow Pattern

```
Frontend Request
  ↓
Django View (content/views/)
  ↓
ContentItem Serializer
  ↓
content/utils.py (fetch_source_data / bulk_fetch_source_data)
  ↓
ProxyAPIClient (content/services/proxy_client.py)
  ↓
Go Proxy Microservice (HTTP)
  ↓
Response to Frontend (ContentItem + source_data)
```

### Proxy Client Methods

The `ProxyAPIClient` provides:
- **Detail**: `get_movie()`, `get_tv_show()`, `get_season()`, `get_game()`, `get_album()`, `get_book()`
- **Bulk**: `get_bulk_movies()`, `get_bulk_tv_shows()`, `get_bulk_games()`, `get_bulk_albums()`, `get_bulk_books()`
- **Search**: `search_movies()`, `search_tv_shows()`, `search_games()`, `search_albums()`, `search_books()` (uses `q` param)
- **Trending**: `trending_movies()`, `trending_tv_shows()`, `trending_games()`, `trending_albums()`, `trending_books()`
- **Aggregate**: `search()` (multi-search), `homepage()`
- **Health**: `health()`

## Key Design Patterns

### 1. Settings Configuration
- All configurations centralized in modular `core/settings/` files
- Proxy API config via `PROXY_API_BASE_URL` and `PROXY_API_KEY` environment variables
- Cache keys defined as templates in `settings.CACHE_KEYS`
- Settings imported via `core/settings/__init__.py`

### 2. Caching Strategy
Cache timeouts (from `settings.CACHE_TIMEOUTS`):
```python
'homepage': 24 hours  # Only local caching; external API caching is handled by the Go proxy
```

### 3. Error Handling
- Custom exception handler in `core/exceptions.py`
- Structured error responses
- Never expose internal errors or API keys to clients
- HTTP status codes follow REST conventions

### 4. Bulk Operations
- `content/utils.py:bulk_fetch_source_data()` groups items by source_api and calls bulk proxy endpoints
- Uses `concurrent.futures.ThreadPoolExecutor` (4 workers) for parallel API-group fetching
- Seasons are fetched individually (no bulk endpoint)

### 5. Signals
- `content/signals/rating_signals.py`: `post_save` and `post_delete` on `Rating` auto-updates `ContentItem.average_rating` and `rating_count` via aggregation

### 6. Permissions
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

### Adding Models to Content App

1. Define model in appropriate file under `content/models/`
2. Create serializer in `content/serializers/`
3. Create viewset in `content/views/`
4. Register in `content/urls.py`
5. Run migrations: `python manage.py makemigrations && python manage.py migrate`

### Working with Content Models

When working with UserList and ListItem:

1. **List membership**: Always check `IsMemberOfList` permission for shared lists
2. **Ordering**: ListItem.list_order is auto-managed; use custom actions for reordering
3. **Ratings**: Updates automatically propagate to ContentItem.average_rating via signals

### Fetching External Data

To fetch external data for a ContentItem:
```python
from content.utils import fetch_source_data, bulk_fetch_source_data

# Single item
data = fetch_source_data(content_item, country_code='US')

# Bulk (optimized with parallel bulk API calls)
cache = bulk_fetch_source_data(content_items, country_code='US')
# cache is a dict: {content_item.id: source_data_dict}
```

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

# Go Proxy Microservice
PROXY_API_BASE_URL=http://localhost:8080/v1/proxy
PROXY_API_KEY=your-proxy-api-key

# CORS (comma-separated)
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Redis (optional, falls back to LocalMemCache)
REDIS_URL=redis://localhost:6379/1
```

## Python Version

The project targets Python 3.11.9 (specified in `runtime.txt`).

## Deployment

The project is production-ready for Railway platform:
- Automatic migrations via Railway deployment hooks
- PostgreSQL support with fallback to SQLite
- Gunicorn configured for production
- Whitenoise for static file serving
- Health check endpoint at `/`
- Railway-specific environment detection in settings
- Requires `PROXY_API_BASE_URL` and `PROXY_API_KEY` environment variables for the Go proxy service
