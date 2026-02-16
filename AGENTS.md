# AGENTS.md

This file provides guidance to Agents when working with code in this repository.


## Agent Setup

To ensure consistent behavior across different AI agents, this project uses a standard set of "Skills" located in `.agents/skills`.

We provide a setup script to synchronize these skills to the configuration directories of various supported agents (e.g., Cursor, Claude, Windsurf, etc.).

**Run the setup script:**

```bash
# Setup for specific agents (recommended)
./scripts/setup_agents.sh --agent cursor --agent claude
./scripts/setup_agents.sh -a cursor -a claude # short version

# Setup for ALL agents
./scripts/setup_agents.sh --all
```


This script will:
1.  Copy `AGENTS.md` to `CLAUDE.md`.
2.  Symlink all skills from `.agents/skills` to the specific configuration folders of supported agents (e.g., `.cursor/skills/`, `.windsurf/skills/`).
3.  Ensure that any new skills added to `.agents/skills` are automatically available to your agent after running the script.

All generated agent directories are configured in `.gitignore` to keep the repository clean.


denn-proxy is a Go REST API proxy that aggregates and normalizes metadata from external content APIs (TMDB, IGDB, Spotify, OpenLibrary) into unified domain models. It provides search, detail retrieval, trending, and bulk operations for movies, TV shows, games, albums, and books, with an optional Redis caching layer.

## Build & Run Commands

```bash
go build -o denn-proxy ./cmd/api    # Build
go run ./cmd/api                     # Run
go test ./...                        # Run all tests
go test ./internal/services/tmdb/    # Run tests for a specific package
```

## Required Configuration

Environment variables loaded from `.env` file or system environment:

**Required:**
- `TMDB_API_KEY` — bearer token for TMDB API
- `IGDB_CLIENT_ID` — OAuth2 client ID for IGDB (Twitch)
- `IGDB_CLIENT_SECRET` — OAuth2 client secret for IGDB (Twitch)
- `SPOTIFY_CLIENT_ID` — OAuth2 client ID for Spotify
- `SPOTIFY_CLIENT_SECRET` — OAuth2 client secret for Spotify

**Optional:**
- `PORT` (default `8080`)
- `REDIS_URL` (default `localhost:6379`) — supports `redis://` URLs and `host:port` format; falls back to NoOpCache if unavailable

## Architecture

**Layered design with dependency injection wired in `cmd/api/main.go`:**

```
Handler (HTTP validation/response) → Service (orchestration + mapping) → Provider/Client (API calls + caching)
```

**Dependency injection flow:**

```
Config → Cache (Redis | NoOpCache)
  → Providers (TMDB, IGDB, Spotify, OpenLibrary)
    → Services (tmdb, games, spotify, books)
      → Handlers (movies, tvshows, games, albums, books, multisearch, homepage)
        → Gin Router (/proxy group)
          → Graceful Shutdown (SIGINT/SIGTERM, 5s timeout)
```

**Key packages under `internal/`:**

- `clients/` — HTTP and caching abstractions. `BaseClient` wraps `net/http` with JSON helpers (30s default timeout); `CachedClient` adds transparent caching via the `Cache` interface (Redis or NoOpCache fallback). Uses functional options pattern (`ClientOption`). Error types: `ErrTimeout`, `ErrConnection`, `ErrNotJSON`, `ErrNotFound`, `APIError`.
- `config/` — Env-based config loading with `godotenv`.
- `models/` — Unified domain models (Movie, TVShow, Game, Album, Book) and shared types (Author, Platform, Images, SearchItem, ContentType/ImageType/ImageSize/AuthorType/AlbumType enums). Each model has a `ToResponse()` method for serialization with configurable image count.
- `providers/` — External API clients, one per source:
  - `providers/tmdb/` — TMDB client. Bearer token auth. Endpoints for movies (search, detail, popular) and TV shows (search, detail, seasons, images, watch providers, popular).
  - `providers/igdb/` — IGDB client. OAuth2 Client Credentials flow via Twitch. Token caching with 5-min buffer and RWMutex. Uses IGDB's custom query language (not REST). Endpoints for game search, detail, bulk, popular, and popularity primitives.
  - `providers/spotify/` — Spotify client. OAuth2 Client Credentials flow with base64-encoded Basic auth. Token caching with 5-min buffer. Endpoints for album search, detail, bulk, and trending (via Spotify Charts API).
  - `providers/openlibrary/` — OpenLibrary client. No authentication. Endpoints for book search, detail, and trending (bestsellers).
- `services/` — Business logic layer, one per domain:
  - `services/tmdb/` — Movie and TV show orchestration. `mapper.go` converts TMDB responses → domain models (image URL building, platform normalization by country, season validation). Bulk operations with channel-based semaphore (max 10 goroutines). Parallel season expansion.
  - `services/games/` — Game orchestration. `mapper.go` converts IGDB responses → domain models (image URL building, Unix timestamp formatting, game type mapping). Trending algorithm: 70% want-to-play + 30% visits score with recency multiplier (up to 4x for newer games), filtering browser-only games.
  - `services/spotify/` — Album orchestration. `mapper.go` converts Spotify responses → domain models. Search excludes singles. Trending via Spotify Charts parsing.
  - `services/books/` — Book orchestration. `mapper.go` converts OpenLibrary responses → domain models (cover image URL building, author extraction). Trending via bestseller search with client-side pagination.
- `handlers/` — Gin HTTP handlers. Validates request params, calls services, returns JSON. Shared response types (`ErrorResponse`, `PaginatedResponse`, `PaginationMetadata`) and utilities (`parseImagesSize`, `parseIDs`, `parseStringIDs`).
  - `handlers/multisearch/` — Multi-search handler. Fans out search queries to all 5 content types in parallel via interface-segregated service dependencies. Supports `types` filter param for searching specific content types. Returns per-type `ContentResult { metadata, results, error }` with partial failure handling.
  - `handlers/homepage/` — Homepage handler. Two-phase parallel fan-out: (1) fetch trending/popular from all 5 services, (2) enrich with bulk detail endpoints. Returns full detail objects (MovieResponse, GameResponse, etc.) preserving trending order via generic `buildOrderedResult[T]`. Country from `X-User-Country` header.

## Key Patterns

- **Cache interface with NoOpCache fallback** — Redis unavailability doesn't crash the server; it degrades to no-caching via `NoOpCache`.
- **Template-based cache keys** — Keys like `tmdb:search:movies:{query}:{page}` with MD5 hash fallback for complex keys (e.g., IGDB queries). TTLs vary by provider and type (search 6–24h, details 12–48h, images/providers 7d).
- **OAuth2 token management** — IGDB and Spotify clients cache access tokens with automatic refresh. 5-minute safety buffer before expiry. Thread-safe via `sync.RWMutex`.
- **Concurrent bulk operations** — All bulk endpoints use channel-based semaphore to limit concurrent API calls to 10 goroutines via `sync.WaitGroup`.
- **Mapper separation** — Each service has a `mapper.go` isolating external API response → domain model conversion, keeping provider types in `types.go` separate from domain models in `models/`.
- **Configurable image count** — All detail/bulk endpoints accept `images_size` query param (default 10) to control how many images are returned.
- **Country-based platform filtering** — Movie and TV show endpoints accept `country` param (default `US`) to filter streaming/rent/buy platform availability.
- **Graceful shutdown** — Signal handling (SIGINT/SIGTERM) with 5-second timeout and resource cleanup (cache connection close) in `main.go`.
- **Handler-level composition** — Aggregate endpoints (multi-search, homepage) compose existing services at the handler level via interface segregation. Each handler defines narrow interfaces covering only the methods it needs, keeping dependencies explicit and testable with mock structs.
- **Two-phase fan-out** — Homepage uses a two-phase concurrent pattern: phase 1 fetches trending items in parallel, phase 2 enriches them with bulk detail calls in parallel. Each phase uses `sync.WaitGroup` with pre-allocated slots for zero-contention writes.

## API Routes

All routes are prefixed with `/proxy/v1`:

### Health
- `GET /proxy/v1/health`

### Aggregate Endpoints
- `GET /proxy/v1/multi-search?query=X&page=1&limit=20&types=movies,tv_shows,games,albums,books` — parallel search across content types, `types` filter optional (defaults to all)
- `GET /proxy/v1/homepage?page=1&limit=10` — trending content with full detail enrichment, country from `X-User-Country` header

### Movies (TMDB)
- `GET /proxy/v1/movies/search?query=X&page=1`
- `GET /proxy/v1/movies/:id?country=US&images_size=10`
- `GET /proxy/v1/movies/bulk?ids=1,2,3&country=US&images_size=10` — max 50 IDs
- `GET /proxy/v1/movies/trending?page=1`

### TV Shows (TMDB)
- `GET /proxy/v1/tv_shows/search?query=X&page=1`
- `GET /proxy/v1/tv_shows/:id?country=US&expand=seasons&images_size=10`
- `GET /proxy/v1/tv_shows/:id/seasons/:season_number?country=US&images_size=10`
- `GET /proxy/v1/tv_shows/bulk?ids=1,2,3&country=US&images_size=10` — max 50 IDs
- `GET /proxy/v1/tv_shows/trending?page=1`

### Games (IGDB)
- `GET /proxy/v1/games/search?query=X&page=1&limit=20` — max limit 500
- `GET /proxy/v1/games/:id?images_size=10`
- `GET /proxy/v1/games/bulk?ids=1,2,3&images_size=10` — max 50 IDs
- `GET /proxy/v1/games/trending?page=1&limit=20` — max limit 100

### Albums (Spotify)
- `GET /proxy/v1/albums/search?query=X&page=1`
- `GET /proxy/v1/albums/:id?images_size=10`
- `GET /proxy/v1/albums/bulk?ids=id1,id2,id3&images_size=10` — max 20 IDs (string)
- `GET /proxy/v1/albums/trending?page=1`

### Books (OpenLibrary)
- `GET /proxy/v1/books/search?query=X&page=1`
- `GET /proxy/v1/books/:id?images_size=10`
- `GET /proxy/v1/books/bulk?ids=id1,id2,id3&images_size=10` — max 20 IDs (string)
- `GET /proxy/v1/books/trending?page=1`

## Project Structure

```
cmd/api/main.go                          # DI wiring & server setup
internal/
├── clients/
│   ├── httpclient.go                    # BaseClient (net/http wrapper)
│   ├── cache.go                         # Cache interface + Redis + NoOpCache
│   ├── cached_client.go                 # Transparent caching layer
│   └── errors.go                        # Error types
├── config/
│   └── config.go                        # Env-based configuration
├── models/
│   ├── base.go                          # Author, Platform, Image, SearchItem
│   ├── movie.go                         # Movie + MovieResponse
│   ├── tvshow.go                        # TVShow + Season + Episode
│   ├── game.go                          # Game + GameResponse
│   ├── album.go                         # Album + Track
│   ├── book.go                          # Book + BookResponse
│   └── constants.go                     # Enums (ContentType, ImageType, etc.)
├── providers/
│   ├── tmdb/                            # TMDB API client (bearer token)
│   ├── igdb/                            # IGDB API client (OAuth2 via Twitch)
│   ├── spotify/                         # Spotify API client (OAuth2)
│   └── openlibrary/                     # OpenLibrary API client (no auth)
├── services/
│   ├── tmdb/
│   │   ├── mapper/                      # TMDB response mapping
│   │   ├── service/                     # Business logic and coordination
│   │   └── types.go                     # External API types
│   ├── games/
│   │   ├── mapper/                      # IGDB response mapping
│   │   ├── service/                     # Business logic and trending
│   │   └── types.go                     # External API types
│   ├── spotify/
│   │   ├── mapper/                      # Spotify response mapping
│   │   ├── service/                     # Business logic and charts parsing
│   │   └── types.go                     # External API types
│   └── books/
│       ├── mapper/                      # OpenLibrary response mapping
│       ├── service/                     # Business logic and bestseller mapping
│       └── types.go                     # External API types
└── handlers/
    ├── common/                          # Shared response types & utilities
    ├── health/                          # Health check handler
    ├── multisearch/                     # Multi-search handler (parallel fan-out)
    ├── homepage/                        # Homepage handler (trending + bulk enrichment)
    ├── movies/                          # Movie handlers
    ├── tvshows/                         # TV show handlers
    ├── games/                           # Game handlers
    ├── albums/                          # Album handlers
    └── books/                           # Book handlers
```
