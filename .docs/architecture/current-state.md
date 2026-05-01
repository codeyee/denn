# Current Architecture State

This document is the fastest accurate summary of how the system works
today.

## Service Ownership

- `web` owns UI, SSR, route protection in the frontend, and the browser
  BFF for proxy calls.
- `core` owns authentication, lists, ratings, invitations, content
  persistence, and local-first reconstruction of normalized detail
  payloads.
- `proxy` owns upstream provider integration, provider credentials,
  caching, rate limiting, normalization, and public metadata endpoints.

## Canonical Request Paths

- Browser -> `web` -> `core` for authenticated domain data.
- Browser -> `web` BFF (`/api/proxy/*`) -> `proxy` for public metadata.
- `web` server components / route handlers -> `proxy` for server-side
  metadata reads.
- `core` -> `proxy` only for enrichment and refresh of persisted content
  data.

The hybrid topology is deliberate and documented in
[`../adr/0001-external-metadata-integration.md`](../adr/0001-external-metadata-integration.md).

## Current System Facts

- Content detail routes are id-first: `/content/[id]`.
- The legacy external triple route still exists only as a compatibility
  bridge toward the id-first route.
- `core` stores per-type local detail rows and reconstructs proxy-shaped
  payloads from them for local-first reads.
- `browse_metadata` exists as a derived read model for list exploration
  and sorting.
- The canonical cross-service error envelope and `X-Request-Id`
  propagation are already implemented in `core` and `proxy`.
- `proxy` remains stateless relative to PostgreSQL and user data.

## Current Frontend State

- TanStack Query is mounted globally and owns frontend server state for
  Home, Search, Content Detail, List Detail, Add-to-List, ratings, and
  list mutations.
- Hover prefetch exists for content cards and list item cards.
- The major protected routes use SSR prefetch with `HydrationBoundary`.

See [`data-fetching.md`](./data-fetching.md).

## Current Auth State

- ADR 0002 is only in phase 1.
- JWTs are no longer persisted to `localStorage`.
- Tokens still exist in JS-readable cookies and in-memory Zustand state.
- `RootLayout` resolves the session server-side and mounts a global
  `AuthSessionBootstrap`.
- `ProtectedRoute` blocks during the store bootstrap window with
  `isBootingSession`.
- Next.js middleware for server-side redirects on protected routes does
  not exist yet.

See [`auth-session-bootstrap.md`](./auth-session-bootstrap.md).

## Current Content Lifecycle

- `proxy` is the only service that talks to TMDB, IGDB, Spotify, and
  OpenLibrary.
- `core` persists `ContentItem` plus per-type detail tables.
- The canonical read path for `source_data` is local-first:
  fresh local detail -> stale local fallback with `is_stale=true` ->
  proxy refresh when needed.
- Periodic refresh uses static per-type TTLs via
  `CONTENT_REHYDRATION_TTL`.
- Dynamic age-based refresh policy is still planned, not merged.

See [`content-lifecycle.md`](./content-lifecycle.md).

## Canonical Supporting Docs

- Contracts: [`../contracts/internal-http.md`](../contracts/internal-http.md)
- Observability: [`../observability.md`](../observability.md)
- Performance baseline: [`../perf/baseline.md`](../perf/baseline.md)
- Workspace operation: [`../workspace-operating-model.md`](../workspace-operating-model.md)
- Open work: [`../roadmap/open-plans.md`](../roadmap/open-plans.md)
