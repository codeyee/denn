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


denn-proxy is a Go REST API proxy that aggregates and normalizes metadata from external content APIs (TMDB for movies/TV, with planned support for IGDB, Spotify, OpenLibrary) into unified domain models. It provides search, detail retrieval, and bulk operations with an optional Redis caching layer.

## Build & Run Commands

```bash
go build -o denn-proxy ./cmd/api    # Build
go run ./cmd/api                     # Run
go test ./...                        # Run all tests
go test ./internal/services/tmdb/    # Run tests for a specific package
```

## Required Configuration

Environment variables loaded from `.env` file or system environment:
- `TMDB_API_KEY` (required) — bearer token for TMDB API
- `REDIS_URL` (optional, default `localhost:6379`) — falls back to NoOpCache if unavailable
- `PORT` (optional, default `8080`)

## Architecture

**Layered design with dependency injection wired in `cmd/api/main.go`:**

```
Handler (HTTP validation/response) → Service (orchestration + mapping) → Provider/Client (API calls + caching)
```

**Key packages under `internal/`:**

- `clients/` — HTTP and caching abstractions. `BaseClient` wraps `net/http` with JSON helpers; `CachedClient` adds transparent caching via the `Cache` interface (Redis or NoOpCache fallback). Uses functional options pattern (`ClientOption`).
- `providers/tmdb/` — TMDB-specific API client built on `CachedClient`. Raw API calls only; no domain logic.
- `services/tmdb/` — Business logic layer. Contains `mapper.go` (TMDB response → domain model conversion) and `types.go` (TMDB API response structs). Handles bulk operations with semaphore-based concurrency (max 10 goroutines via channel + `sync.WaitGroup`).
- `handlers/` — Gin HTTP handlers. Validates request params, calls services, returns JSON responses.
- `models/` — Domain models (Movie, TVShow, Album, Book, Game) and shared types (Images, SearchItem, ContentType enums).
- `config/` — Env-based config loading with `godotenv`.

## Key Patterns

- **Cache interface with NoOpCache fallback** — Redis unavailability doesn't crash the server; it degrades to no-caching via `NoOpCache`.
- **Template-based cache keys** — Keys like `tmdb:search:movies:{query}:{page}` with MD5 hash fallback for complex keys. TTLs vary by type (6h search, 12h details, 7d images).
- **Concurrent bulk operations** — `GetBulkMovies`/`GetBulkTVShows` use channel-based semaphore to limit concurrent API calls to 10.
- **Mapper separation** — `services/tmdb/mapper.go` isolates all TMDB→domain model conversion, keeping provider types in `types.go` separate from domain models.
- **Graceful shutdown** — Signal handling with 5-second timeout and resource cleanup in `main.go`.

## API Routes

All routes are prefixed with `/proxy`:
- `GET /proxy/health`
- `GET /proxy/movies/search?query=X&page=Y`
- `GET /proxy/movies/:id?country=US`
- `GET /proxy/movies/bulk?ids=1,2,3`
- `GET /proxy/tv_shows/search?query=X&page=Y`
- `GET /proxy/tv_shows/:id?expand=seasons`
- `GET /proxy/tv_shows/:id/seasons/:season_number`
