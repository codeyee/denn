---
name: denn-proxy-architecture
description: Expert guide for implementing new domain flows (Games, Music, Books) in the denn-proxy architecture.
license: MIT
metadata:
  author: Agent
  version: "1.0.0"
  domain: architecture
  triggers: architecture, implementation flow, new domain, handlers, services, providers
  role: specialist
  scope: implementation
  output-format: markdown
  related-skills: golang-pro
---

# Denn Proxy Architecture Specialist

You are an expert in the `denn-proxy` architecture. Your role is to guide the implementation of new domain flows (e.g., Games, Music, Books) ensuring they follow the established strict layered architecture, patterns, and best practices.

## Core Philosophy

- **Layered Architecture**: Strict separation of concerns: `Handlers` -> `Services` -> `Providers`.
- **Domain Driven**: Code is organized by domain (e.g., `tmdb` for movies/tv) within layers.
- **Type Safety**: Strong usage of Go types and interfaces.
- **Performance**: Heavy emphasis on caching (`clients.CachedClient`), concurrency (data fetching), and avoiding N+1 problems.

## Directory Structure

| Path | Purpose | Key Pattern |
|Data|---|---|
| `internal/models` | Domain entities and shared structs. | JSON tags, helper methods (e.g., `ToResponse`). |
| `internal/providers` | External API clients. | `clients.CachedClient`, request construction. |
| `internal/services` | Business logic & orchestration. | `NewService`, `mapDomain`, `GetComplete`. |
| `internal/handlers` | HTTP transport layer. | `gin.Context`, parameter parsing, error handling. |
| `cmd/api` | Entry point & wiring. | `main.go` wires everything together. |
| `internal/config` | Configuration. | Environment variables via `godotenv`. |

## Implementation Flow (Step-by-Step)

Follow this process to implement a new domain (e.g., "Games" via IGDB).

### Step 1: Define the Domain Models (`internal/models`)

Create a file `internal/models/<domain>.go`.
- Define the core struct (e.g., `Game`).
- Define the response struct (e.g., `GameResponse`) if different.
- Add helper methods like `ToResponse`.

```go
package models

type Game struct {
    ID          string `json:"id"`
    Title       string `json:"title"`
    // ... other fields
}
```

### Step 2: Implement the Provider (`internal/providers/<provider>`)

1.  **Client Setup (`client.go`)**:
    - Wrap `clients.CachedClient`.
    - Configure base URL and headers (API keys).
    - Define cache keys and TTLs.

```go
package igdb

type Client struct {
    *clients.CachedClient
}

func NewClient(clientID, clientSecret string, cache clients.Cache) *Client {
    // ... implementation logic
}
```

2.  **API Methods (`<domain>.go`)**:
    - Implement methods to fetch data from original APIs.
    - **CRITICAL**: Use `CacheConfig` keys defined in `client.go`.
    - Return `*clients.Response`.

### Step 3: Implement the Service (`internal/services/<provider>`)

1.  **Service Setup (`service.go`)**:
    - Struct holding the `Client`.
    - Constructor `NewService`.

2.  **Mapper (`mapper.go`)**:
    - dedicated file for `mapExternalToDomain` functions.
    - Keeps service logic clean.

3.  **Business Logic (`service.go`)**:
    - `Get<Entity>Complete`: Fetches main data + related data (concurrently if needed).
    - `Search<Entity>`: Handles search queries.
    - **Concurrency Pattern**: Use `sync.WaitGroup` to fetch related data (e.g., reviews, DLCs) in parallel.

```go
func (s *Service) GetGameComplete(ctx context.Context, id int) (models.Game, error) {
    // Fetch base game
    // Fetch details/reviews concurrently
    // Map to model
}
```

### Step 4: Implement the Handler (`internal/handlers`)

Create `internal/handlers/<domain>.go`.
- Struct holding the `Service`.
- Methods for `Search`, `Detail`, `Bulk`.
- Parse parameters (`page`, `query`, `ids`).
- Handle errors using `respondError`.

```go
type GameHandler struct {
    service *igdbservice.Service
}

func (h *GameHandler) Detail(c *gin.Context) {
    // Parse ID
    // Call service
    // Return JSON
}
```

### Step 5: Wire It Up (`cmd/api/main.go`)

- Load Config.
- Initialize `Provider Client`.
- Initialize `Service` with Client.
- Initialize `Handler` with Service.
- Register Routes in `gin` router.

## Best Practices & Rules

### 1. Concurrency
- **Bulk Fetching**: When fetching a list of items with details, use a semaphore-limited concurrency pattern (see `GetBulkMovies` in `tmdb/service.go`).
- **Detail Expansion**: When fetching a single item with many sub-resources (seasons, episodes), fetch them in parallel goroutines using `WaitGroups`.

### 2. Caching
- **Always** use `clients.CachedClient`.
- Define granular cache keys (e.g., `"tmdb:details:{id}:{append}"`).
- Set appropriate TTLs based on content volatility.

### 3. Error Handling
- Wrap errors: `fmt.Errorf("context: %w", err)`.
- Use specific error codes in handlers (`CodeNotFound`, `CodeInternalError`).

### 4. Configuration
- Never hardcode keys or URLs. Use `internal/config`.
- Fail fast if required config is missing.

### 5. API Response Standards
- Use `PaginatedResponse` for lists/search.
- Use strict JSON naming (snake_case).
- Always respect `imagesSize` or similar display parameters if applicable.
