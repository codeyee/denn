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
- `web` route loaders and server-side fetch helpers -> `proxy` for
  server-side metadata reads.
- `core` -> `proxy` only for enrichment and refresh of persisted content
  data.

The hybrid topology is deliberate and documented in
[`../adr/0001-external-metadata-integration.md`](../adr/0001-external-metadata-integration.md).

## Current System Facts

- Content detail routes are id-first: `/content/<id>` (file route
  `web/src/routes/content/$id.tsx`).
- The legacy external triple route still exists only as a compatibility
  bridge toward the id-first route.
- `core` stores per-type local detail rows and reconstructs proxy-shaped
  payloads from them for local-first reads.
- `browse_metadata` exists as a derived read model for list exploration
  and sorting.
- The canonical cross-service error envelope and `X-Request-Id`
  propagation are already implemented in `core` and `proxy`.
- A logical SSR navigation now keeps one bounded `X-Request-Id` across
  parallel `web` reads to `core` and `proxy`; responses expose bounded
  cache state and non-sensitive `Server-Timing`.
- `proxy` remains stateless relative to PostgreSQL and user data.

## Current Frontend State

- `web` runs on **TanStack Start** (Vite + Nitro). Routes live in
  `web/src/routes/` using TanStack Router file conventions
  (`__root.tsx`, `index.tsx`, `<segment>.tsx`, `$param.tsx`, `$.ts`).
- TanStack Query is mounted globally and owns frontend server state for
  Home, Search, Content Detail, List Detail, Add-to-List, ratings, and
  list mutations.
- SSR prefetch happens inside `loader` functions that call
  `context.queryClient.ensureQueryData(...)`. The router rehydrates the
  cache on the client; routes do not wrap with `<HydrationBoundary>`.
- List-style routes that are URL-driven should prefer typed TanStack
  search params over reparsing raw `searchStr`, because URL values may
  be serialized differently from the validated route search object.
- Server-only RPC lives in `web/src/server/` (`getSessionFn`,
  `getCountryFn`, `getRuntimeEnvFn`) using `createServerFn` from
  `@tanstack/react-start`.
- BFF API routes live next to page routes
  (`web/src/routes/api/cards.ts`, `api/perf/vitals.ts`, `api/proxy/$.ts`)
  and use `createFileRoute(...)` with `server.handlers` over standard
  `Request`/`Response`.
- Public BFF inputs fail closed: proxy splats are confined to the configured
  proxy base path, and Web Vitals ingestion bounds request size, accepted
  fields, and per-instance log volume.
- The production-build Playwright harness uses non-personal deterministic
  fixtures. Desktop smoke is a PR gate; mobile smoke, known-regression
  characterization and cold/warm baselines are repeatable root commands.
- Hover prefetch exists for content cards and list item cards via the
  router's default `preload="intent"`.
- Decision recorded in [ADR 0003](../adr/0003-migrate-web-from-nextjs-to-tanstack-start.md).

See [`data-fetching.md`](./data-fetching.md).

## Current Auth State

- ADR 0002 is only in phase 1.
- JWTs are no longer persisted to `localStorage`.
- Tokens still exist in JS-readable cookies and in-memory Zustand state.
- The TanStack Start root route (`web/src/routes/__root.tsx`) resolves
  the session server-side via `getSessionFn` and mounts a global
  `AuthSessionBootstrap`.
- `ProtectedRoute` blocks during the store bootstrap window with
  `isBootingSession`.
- Protected routes also redirect server-side via route `beforeLoad`,
  while preserving a client fallback for the bootstrap race and the
  unavailable-backend path.

See [`auth-session-bootstrap.md`](./auth-session-bootstrap.md).

## Current Content Lifecycle

- `proxy` is the only service that talks to TMDB, IGDB, Spotify, and
  OpenLibrary.
- `core` persists `ContentItem` plus per-type detail tables.
- The canonical read path for `source_data` is local-first:
  fresh local detail -> stale local fallback with `is_stale=true` ->
  proxy refresh when needed.
- Periodic refresh uses `CONTENT_REHYDRATION_POLICY`, including
  SQL-side `refresh_due_at` selection and age-band-aware logging.

See [`content-lifecycle.md`](./content-lifecycle.md).

## Canonical Supporting Docs

- Contracts: [`../contracts/internal-http.md`](../contracts/internal-http.md)
- Observability: [`../observability.md`](../observability.md)
- Performance baseline: [`../perf/baseline.md`](../perf/baseline.md)
- Workspace operation: [`../workspace-operating-model.md`](../workspace-operating-model.md)
- Browser verification:
  [`../runbooks/browser-e2e-and-baseline.md`](../runbooks/browser-e2e-and-baseline.md)
- Open work: [`../roadmap/open-plans.md`](../roadmap/open-plans.md)
