# Denn

Denn is a multi-media tracker for movies, TV shows, games, albums, and books. It combines public metadata discovery with authenticated user-owned features such as lists, ratings, shared list membership, and stable content-detail routes backed by local persistence.

The project is built as a single monorepo with three cooperating services:

| Path    | Stack                     | Responsibility |
| ------- | ------------------------- | -------------- |
| `web/`  | Next.js 16 + React 19 + TypeScript | Frontend UI, SSR, protected routes, and the browser-facing BFF for metadata |
| `core/` | Django 5.2 + DRF          | Auth, lists, ratings, invitations, content persistence, and local-first detail reads |
| `proxy/`| Go 1.25 + Gin             | External metadata gateway for TMDB, IGDB, Spotify, and OpenLibrary |

## What Denn Does

At a product level, Denn currently supports:

- Multi-source discovery across movies, TV shows, games, albums, and
  books.
- Search and detail views for external content, routed by internal
  Denn content id.
- User authentication with protected routes.
- Personal and shared lists.
- List invitations and membership workflows.
- Item status tracking, ratings, and canonical list ordering.
- Advanced list exploration with filters, grouping, range filters, and
  multi-field sort.
- Local-first content detail persistence in `core`, so detail payloads
  can be reconstructed from PostgreSQL instead of always hitting the
  upstream metadata layer.

## Architecture

The integration model is intentionally hybrid:

- **Browser -> `web` -> `core`** for authenticated domain data.
- **Browser -> `web` BFF -> `proxy`** for public metadata calls.
- **`web` server-side code -> `proxy`** for SSR metadata reads.
- **`core` -> `proxy`** for enrichment and refresh of persisted content.

In other words:

- `web` serves pages and mediates browser-safe metadata access.
- `core` owns the product domain and local persistence.
- `proxy` is the only service allowed to talk directly to third-party
  metadata providers.

This boundary is a deliberate architectural decision, not an accident. The rationale and tradeoffs live in [`.docs/adr/0001-external-metadata-integration.md`](./.docs/adr/0001-external-metadata-integration.md).

### Content Lifecycle

Denn uses an internal content id as the stable public route key:

- frontend detail route: `/content/[id]`
- persistence anchor: `core.content.models.ContentItem`
- upstream identifiers: kept as provider-specific source fields behind
  the internal id

`core` stores typed local detail rows and reconstructs proxy-shaped payloads from them on the read path. Fresh local data is served immediately; stale or missing data is refreshed through `proxy`.

### Auth State

The auth model is in transition:

- JWTs are no longer persisted to `localStorage`
- the layout resolves session server-side and bootstraps the client
  store globally
- cookies are still not `HttpOnly` yet, so the final hardening phase is
  still open

That roadmap is documented in [`.docs/adr/0002-web-auth-cookies.md`](./.docs/adr/0002-web-auth-cookies.md).

## Monorepo Structure

```text
.
├── web/      # Next.js frontend + BFF
├── core/     # Django/DRF domain API
├── proxy/    # Go metadata gateway
├── .docs/    # Architecture, contracts, roadmap, runbooks, history
├── .github/  # CI and deploy workflows
├── .scripts/ # Workspace helpers
└── Makefile  # Root entrypoints for local work and validation
```

### `web/`

The frontend owns UI composition, SSR, route protection, and the browser-facing proxy BFF.

Important directories:

- `web/app/` - routes, layouts, loading states, BFF handlers
- `web/lib/` - API clients, query hooks, helpers, utilities
- `web/app/_components/` - shared and page-specific UI

Key implementation traits:

- Next.js App Router
- id-first content routing
- TanStack Query as the intended server-state layer
- Zustand still used for client/UI state and some transitional fetch
  flows
- `next build --webpack` is intentional and part of the repo contract

### `core/`

The backend API owns user-authenticated domain behavior and content storage. It is not a general-purpose metadata gateway.

Important directories:

- `core/authentication/` - login, registration, logout, auth endpoints
- `core/content/` - models, services, serializers, views, tests
- `core/core/settings/` - modular settings

Key implementation traits:

- Django + Django REST Framework
- JWT auth via `dj-rest-auth` and SimpleJWT
- local-first content detail persistence
- derived browse metadata for list exploration
- shared cross-service error envelope with `proxy`

### `proxy/`

The proxy is a stateless Go service that shields the rest of the system from provider-specific schemas, credentials, rate limits, and caching concerns.

Important directories:

- `proxy/cmd/api/` - entrypoint and wiring
- `proxy/internal/providers/` - raw upstream clients
- `proxy/internal/services/` - orchestration and mapping
- `proxy/internal/handlers/` - HTTP handlers

Key implementation traits:

- Gin HTTP server
- provider integrations for TMDB, IGDB, Spotify, and OpenLibrary
- Redis-backed cache and rate limiting with graceful degradation
- structured JSON logs and request correlation

## Technology Stack

### Frontend

- Next.js 16
- React 19
- TypeScript 5
- Tailwind CSS 4
- TanStack Query 5
- Zustand 5
- Radix UI
- React Hook Form + Zod
- DnD Kit

### Core API

- Python 3
- Django 5.2
- Django REST Framework 3.16
- `dj-rest-auth`
- SimpleJWT
- `drf-spectacular`
- Redis support via `django-redis`
- PostgreSQL in normal environments, SQLite fallback in limited local
  setups

### Metadata Proxy

- Go 1.25
- Gin
- `go-redis`
- Provider-specific adapters and mappers per external source

## Contracts And Invariants

These are non-negotiable unless the docs and tests are updated in the same change:

- `proxy` is the only owner of provider credentials.
- `PROXY_API_KEY` is server-only. Never expose it with a
  `NEXT_PUBLIC_` prefix.
- `core` is not a general-purpose metadata gateway.
- `proxy` must remain stateless with respect to PostgreSQL and user
  sessions.
- `X-Request-Id` propagation and the canonical error envelope are shared
  contracts across `core` and `proxy`.
- Content detail navigation should use the internal Denn content id once
  it exists.

The canonical contract is documented in [`.docs/contracts/internal-http.md`](./.docs/contracts/internal-http.md).

## Local Development

Use the root workflow first:

```bash
make check
make up
make status
make logs
make doctor
make down
```

For isolated service work:

```bash
# core (Django, port 8000)
cd core && python3 -m venv .venv && source .venv/bin/activate \
  && pip install -r requirements.txt \
  && cp .env.example .env \
  && ./.venv/bin/python manage.py migrate \
  && ./.venv/bin/python manage.py runserver

# proxy (Go, port 8081)
cd proxy && cp .env.example .env && make run

# web (Next.js, port 3000)
cd web && cp .env.example .env.local && npm install && npm run dev
```

The canonical env-var ownership matrix lives in [`.docs/contracts/internal-http.md`](./.docs/contracts/internal-http.md). The most important rule is still: `PROXY_API_KEY` must remain server-only.

## Validation

Root validation commands:

```bash
make validate-web
make validate-core
make validate-proxy
make test
```

Notes:

- `make validate-web` runs lint plus the production build.
- `make validate-core` depends on a working test database and valid env.
- `make validate-proxy` must remain deterministic and offline-safe.

The shared error-envelope contract is locked down in:

- `proxy/internal/handlers/common/response_test.go`
- `core/core/tests/test_error_envelope.py`

## CI And Deploy

The repo validates changes from the root and deploys each app independently.

- Pull requests run
  [`.github/workflows/monorepo-ci.yml`](./.github/workflows/monorepo-ci.yml),
  which detects touched paths and finishes with a single `ci-summary`
  check for branch protection.
- Pushes to `main` trigger app-specific deploy workflows:
  - [`deploy-web.yml`](./.github/workflows/deploy-web.yml)
  - [`deploy-core.yml`](./.github/workflows/deploy-core.yml)
  - [`deploy-proxy.yml`](./.github/workflows/deploy-proxy.yml)
- Each app builds and deploys independently from its own directory.

## Documentation Map

Start here when you need project context:

- [`.docs/README.md`](./.docs/README.md) - central documentation index
- [`.docs/architecture/current-state.md`](./.docs/architecture/current-state.md) -
  current system snapshot
- [`.docs/features/implemented.md`](./.docs/features/implemented.md) -
  shipped capabilities and platform foundations
- [`.docs/technical-debt.md`](./.docs/technical-debt.md) - active debt
- [`.docs/roadmap/open-plans.md`](./.docs/roadmap/open-plans.md) -
  open and partially implemented work
- [`.docs/contracts/internal-http.md`](./.docs/contracts/internal-http.md) -
  cross-service contract
- [`.docs/observability.md`](./.docs/observability.md) - log schema,
  request correlation, and alerting guidance
- [`.docs/history/implementation-history.md`](./.docs/history/implementation-history.md) -
  durable summary of completed sprint outcomes
- [`AGENTS.md`](./AGENTS.md) - contributor and agent rules for the repo
