# Denn

Denn is a multi-media tracker for movies, TV shows, games, albums, and books. It combines public metadata discovery with authenticated user-owned features such as lists, ratings, shared list membership, and stable content-detail routes backed by local persistence.

The project is built as a single monorepo with three cooperating services:

| Path    | Stack                     | Responsibility |
| ------- | ------------------------- | -------------- |
| `web/`  | TanStack Start (Vite + Nitro) + React 19 + TypeScript | Frontend UI, SSR, protected routes, and the browser-facing BFF for metadata |
| `core/` | Django 5.2 + DRF          | Auth, lists, ratings, invitations, content persistence, and local-first detail reads |
| `proxy/`| Go 1.25 + Gin             | External metadata gateway for TMDB, IGDB, Spotify, and OpenLibrary |

## What Denn Does

At a product level, Denn currently supports:

- Multi-source discovery across movies, TV shows, games, albums, and
  books.
- Search and detail views for external content, routed by internal
  Denn content id.
- User authentication with protected routes.
- First-class personal tracking with backlog, in-progress, completed,
  on-hold, and dropped states.
- Public user profiles with favorites, reviews, completions, and public
  lists.
- Personal and shared lists.
- Anonymous reads for public content details and public lists.
- List invitations and membership workflows.
- List-item status workflows, ratings, and canonical list ordering.
- Advanced list exploration with filters, grouping, range filters, and
  multi-field sort.
- Local-first content detail persistence in `core`, so detail payloads
  can be reconstructed from PostgreSQL instead of always hitting the
  upstream metadata layer.

Public search/browse, richer public content aggregates, full Lists 2.0
roles, and leaderboards remain planned.

## Architecture

The integration model is intentionally hybrid:

- **Browser -> `web` BFF -> `core`** for authenticated domain data and
  auth lifecycle calls.
- **Browser -> `web` BFF -> `proxy`** for public metadata calls.
- **`web` server loaders and server functions -> `proxy`** for SSR metadata reads.
- **`core` -> `proxy`** for enrichment and refresh of persisted content.

In other words:

- `web` serves pages and mediates browser-safe metadata access.
- `core` owns the product domain and local persistence.
- `proxy` is the only service allowed to talk directly to third-party
  metadata providers.

This boundary is a deliberate architectural decision, not an accident. The rationale and tradeoffs live in [`.docs/adr/0001-external-metadata-integration.md`](./.docs/adr/0001-external-metadata-integration.md).

## Documentation Map

The canonical documentation entrypoint is [`.docs/README.md`](./.docs/README.md).

For most work, read in this order:

1. [`.docs/architecture/current-state.md`](./.docs/architecture/current-state.md)
2. [`.docs/features/implemented.md`](./.docs/features/implemented.md)
3. [`.docs/technical-debt.md`](./.docs/technical-debt.md)
4. [`.docs/roadmap/open-plans.md`](./.docs/roadmap/open-plans.md)
5. [`.docs/contracts/internal-http.md`](./.docs/contracts/internal-http.md)
6. [`.docs/adr/0001-external-metadata-integration.md`](./.docs/adr/0001-external-metadata-integration.md)
7. [`.docs/adr/0002-web-auth-cookies.md`](./.docs/adr/0002-web-auth-cookies.md)
8. [`.docs/adr/0003-migrate-web-from-nextjs-to-tanstack-start.md`](./.docs/adr/0003-migrate-web-from-nextjs-to-tanstack-start.md)

Operational rule:

- `architecture/*` documents merged behavior.
- `features/implemented.md` is the shipped baseline.
- `roadmap/open-plans.md` is the condensed backlog.
- `.docs/sprints/` contains only open or future execution plans.
- `history/implementation-history.md` stores outcomes extracted from
  completed sprint docs.

Practical usage flow:

1. If you want to understand the repo: `README.md` ->
   `.docs/README.md`
2. If you want to know how the system works today:
   `architecture/current-state.md`
3. If you want to know what already exists:
   `features/implemented.md`
4. If you want to know what comes next:
   `roadmap/open-plans.md`
5. If you are about to execute or verify something sensitive:
   `runbooks/`
6. If you are changing a structural decision:
   `adr/`
7. If you are evaluating an idea that is not approved yet:
   `ideas/`

When resuming the project, do not jump directly into the first sprint
file. Read:

1. `README.md`
2. `.docs/README.md`
3. `architecture/current-state.md`
4. `features/implemented.md`
5. `technical-debt.md`
6. `roadmap/open-plans.md`
7. then the first relevant active sprint under `.docs/sprints/`

That keeps implementation work anchored to the real current state, not
to stale assumptions inside an older plan.

### Content Lifecycle

Denn uses an internal content id as the stable public route key:

- frontend detail route: `/content/<id>` (TanStack file route `web/src/routes/content/$id.tsx`)
- persistence anchor: `core.content.models.ContentItem`
- upstream identifiers: kept as provider-specific source fields behind
  the internal id

`core` stores typed local detail rows and reconstructs proxy-shaped payloads from them on the read path. Fresh local data is served immediately; stale or missing data is refreshed through `proxy`.

### Auth State

The auth model is server-mediated:

- JWTs exist only in `HttpOnly`, production-`Secure`,
  `SameSite=Lax` cookies
- the root route resolves session server-side (`beforeLoad` / server
  functions) and bootstraps the client store globally
- browser API calls use same-origin BFF routes and mutations require a
  double-submit CSRF token
- Zustand/localStorage contain identity and UI state, never JWTs

That roadmap is documented in [`.docs/adr/0002-web-auth-cookies.md`](./.docs/adr/0002-web-auth-cookies.md).

## Monorepo Structure

```text
.
├── web/      # TanStack Start (Vite + Nitro) frontend + BFF
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

- `web/src/routes/` - TanStack Router file routes (pages + `api/*` server handlers)
- `web/src/components/`, `web/src/hooks/`, `web/src/providers/`, `web/src/stores/` - UI and client state
- `web/src/lib/` - API clients, TanStack Query keys/hooks, utilities
- `web/src/server/` - server-only helpers (`createServerFn`, proxy BFF helpers, session)

Key implementation traits:

- TanStack Start + TanStack Router + Vite 7; production server is Nitro (`.output/`)
- id-first content routing
- TanStack Query for server-state; route loaders call `ensureQueryData` (no Next.js `HydrationBoundary`)
- Zustand for auth/session UI state
- Runtime public config for the browser is injected via `window.__ENV__`
  from the server (see `web/src/server/runtime-env.ts`); authenticated
  core URLs and credentials remain server-only

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

- TanStack Start + TanStack Router
- Vite 7 + Nitro (production Node server)
- React 19
- TypeScript 5
- Tailwind CSS 4 (`@tailwindcss/vite`)
- TanStack Query 5
- Zustand 5
- Radix UI
- React Hook Form + Zod
- DnD Kit
- Vitest + Testing Library (frontend tests)

Use a **current Node.js LTS** locally (TanStack Start / Vite 7 expect **Node 20.19+** or **22.12+** per upstream engine ranges).

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
- `PROXY_API_KEY` is server-only. Never expose it in client bundles or
  `window.__ENV__` (do not use a public env prefix for secrets).
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

# proxy (Go, port 8080)
cd proxy && cp .env.example .env && make run

# web (TanStack Start / Vite, port 3000)
cd web && cp .env.example .env && pnpm install && pnpm run dev
```

The canonical env-var ownership matrix lives in [`.docs/contracts/internal-http.md`](./.docs/contracts/internal-http.md). The most important rule is still: `PROXY_API_KEY` must remain server-only.

## Validation

Root validation commands:

```bash
make validate-web
make validate-core
make validate-proxy
make test
make e2e-web
make e2e-web-regressions
make e2e-web-performance
```

Notes:

- `make validate-web` runs lint plus the production build.
- `make validate-core` depends on a working test database and valid env.
- `make validate-proxy` must remain deterministic and offline-safe.
- `make e2e-web` builds the Nitro production bundle and runs the stable
  Playwright smoke on desktop and mobile.
- `make e2e-web-regressions` reproduces quarantined audit failures;
  `make e2e-web-performance` writes the repeatable cold/warm baseline.

The shared error-envelope contract is locked down in:

- `proxy/internal/handlers/common/response_test.go`
- `core/core/tests/test_error_envelope.py`

## CI And Deploy

The repo validates changes from the root and deploys each app independently.

- Pull requests run
  [`.github/workflows/monorepo-ci.yml`](./.github/workflows/monorepo-ci.yml),
  which detects touched paths and finishes with a single `ci-summary`
  check for branch protection. Changes to `web` also run the stable
  desktop production-build browser smoke.
- Weekly and manual
  [`.github/workflows/browser-baseline.yml`](./.github/workflows/browser-baseline.yml)
  runs preserve cold/warm measurements and known-regression artifacts.
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
- [`.docs/adr/0001-external-metadata-integration.md`](./.docs/adr/0001-external-metadata-integration.md) -
  hybrid topology `web` / `core` / `proxy`
- [`.docs/adr/0002-web-auth-cookies.md`](./.docs/adr/0002-web-auth-cookies.md) -
  web session / cookie direction
- [`.docs/adr/0003-migrate-web-from-nextjs-to-tanstack-start.md`](./.docs/adr/0003-migrate-web-from-nextjs-to-tanstack-start.md) -
  frontend stack (TanStack Start)
- [`.docs/contracts/internal-http.md`](./.docs/contracts/internal-http.md) -
  cross-service contract
- [`.docs/observability.md`](./.docs/observability.md) - log schema,
  request correlation, and alerting guidance
- [`.docs/runbooks/browser-e2e-and-baseline.md`](./.docs/runbooks/browser-e2e-and-baseline.md) -
  production-build browser smoke, regression and baseline procedure
- [`.docs/history/implementation-history.md`](./.docs/history/implementation-history.md) -
  durable summary of completed sprint outcomes
- [`AGENTS.md`](./AGENTS.md) - contributor and agent rules for the repo
