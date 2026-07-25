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

- Browser -> `web` BFF (`/api/core/*`) -> `core` for authenticated
  domain data and safe public content-detail reads.
- Browser -> fixed `web` BFF auth routes (`/api/auth/*`) -> `core` for
  login, registration, refresh and logout.
- Browser -> `web` BFF (`/api/proxy/*`) -> `proxy` for public metadata.
- `web` route loaders and server-side fetch helpers -> `proxy` for
  server-side metadata reads.
- `web` server -> `core` for trusted bulk resolution of stable Denn ids
  in homepage/search payloads.
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
- `UserContentTracking` is the personal-state source of truth; list-item
  status is no longer treated as personal tracking.
- Public identities live at `/user/<username>` and compose only
  persisted Core metadata. Public profiles, public content detail, and
  public lists are anonymous reads; private lists are indistinguishable
  from missing lists to outsiders.
- Ratings outside `completed` are preserved but inactive, and all
  public/global aggregates exclude inactive ratings.
- List visibility (`PUBLIC`/`PRIVATE`) is independent of collaboration
  type (`PERSONAL`/`SHARED`).
- `browse_metadata` exists as a derived read model for list exploration
  and sorting.
- The canonical cross-service error envelope and `X-Request-Id`
  propagation are already implemented in `core` and `proxy`.
- A logical SSR navigation now keeps one bounded `X-Request-Id` across
  parallel `web` reads to `core` and `proxy`; responses expose bounded
  cache state and non-sensitive `Server-Timing`.
- Discovery payloads are resolved to stable Denn ids in one trusted
  server-side bulk request before cards render. The resolver accepts an
  authenticated user or `web` with the shared server-only key; browsers
  cannot call it anonymously. Card hover/focus performs only a pure
  detail prefetch; it never creates content.
- `proxy` remains stateless relative to PostgreSQL and user data.

## Current Frontend State

- `web` runs on **TanStack Start** (Vite + Nitro). Routes live in
  `web/src/routes/` using TanStack Router file conventions
  (`__root.tsx`, `index.tsx`, `<segment>.tsx`, `$param.tsx`, `$.ts`).
- `/`, `/search`, and `/content/<id>` are public catalog surfaces.
  Authenticated Home adds personal lists to the same catalog. `/welcome`
  is retired; its cover-gallery visual language is reused by the
  dedicated login and registration shell.
- TanStack Query is mounted globally and owns frontend server state for
  Home, Search, Content Detail, List Detail, Add-to-List, ratings,
  tracking, public profiles, and list mutations.
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
- The Core BFF admits anonymous `GET`/`HEAD` only for strict profile,
  content-detail, and list-detail patterns. Public reads degrade to
  anonymous after an unsuccessful stale-cookie refresh; all mutations
  remain authenticated.
- `GET /api/version` exposes only the full web `BUILD_SHA` with
  `Cache-Control: no-store`. Cross-service deploys use it to prove the
  compatible BFF is live before the core auth cutover.
- The production-build Playwright harness uses non-personal deterministic
  fixtures. Desktop smoke is a PR gate; mobile smoke, known-regression
  characterization and cold/warm baselines are repeatable root commands.
- The separate local Playwright smoke targets a loopback-only Compose
  stack backed by persistent PostgreSQL snapshot data. It is development
  evidence and never replaces deterministic CI or deployed release
  evidence.
- Content cards and list item cards render semantic links with a known
  internal id. Hover/focus prefetch uses a pure `GET`, while click
  navigation exposes immediate pending feedback.
- Guest Add-to-List and Rating actions redirect to Login with the
  current route in `next`; registration preserves the same return path.
- Content-detail query keys are viewer-scoped (`anonymous` or user id),
  so public data cannot reuse authenticated rating state.
- The critical login -> home -> search -> detail -> back flow is covered
  in desktop and mobile production-build smoke, including the former
  session-loss, logout-loop, hover-write, delayed-detail, and React 418
  regressions.
- Hero, card, episode, and detail artwork use semantic responsive images.
  Only the active hero image is mounted with high fetch priority;
  non-critical card media is lazy and dimensions are reserved.
- The featured carousel exposes pause/resume, interaction pause,
  reduced-motion behavior, one roving tab stop among its selectors, and
  stable aspect-ratio geometry. Content carousels use native horizontal
  scroll and snap so touch and keyboard focus preserve browser
  behavior.
- Route transitions focus the new main landmark, critical and legal
  routes expose one coherent H1, and the production-build browser suite
  runs axe plus keyboard, touch-target, reduced-motion, legal-route, and
  320–1440px reflow checks.
- Mobile navigation includes an expandable named search form. About,
  Privacy, Terms, and Contact are real routes with metadata/canonical
  links, and unknown routes render the application 404.
- Decision recorded in [ADR 0003](../adr/0003-migrate-web-from-nextjs-to-tanstack-start.md).

See [`data-fetching.md`](./data-fetching.md).
Personal tracking, public identity, public-list reads, and profile UI are
defined in
[`public-profiles-and-tracking.md`](./public-profiles-and-tracking.md).

## Current Auth State

- ADR 0002 phases 1–3 are implemented.
- JWTs exist only in server-readable `HttpOnly` cookies and outbound
  server-to-core Authorization headers.
- Zustand/localStorage persist only non-sensitive identity/UI state.
- Browser mutations use same-origin BFF routes with double-submit CSRF;
  refresh rotation is coalesced and logout-all blacklists every
  outstanding refresh credential.
- The TanStack Start root route (`web/src/routes/__root.tsx`) resolves
  the session server-side via `getSessionFn` and mounts a global
  `AuthSessionBootstrap`.
- `ProtectedRoute` blocks during the store bootstrap window with
  `isBootingSession`.
- Session resolution distinguishes `pending`, `anonymous`,
  `authenticated`, `expired`, `unavailable`, and `timeout`.
- Protected routes redirect only for confirmed anonymous/expired
  sessions. Operational failures preserve known credentials, render a
  recoverable fallback, and never masquerade as logout.
- Catalog routes remain readable for anonymous/expired sessions.
  Account-owned routes and every personal mutation stay protected.
- Content-detail client reads have one bounded attempt; timeout or
  upstream failure renders an explicit retry instead of leaving an
  unbounded skeleton or discarding the session.
- The authenticated navbar renders the current avatar, with an initials
  fallback, and links directly to `/user/<username>`.
- Owners edit their public bio/avatar in an accessible modal on their
  public profile. The optimistic profile mutation updates both the
  profile query and session identity before revalidation.
- `/settings` preserves private account preferences/actions. `/profile`
  is no longer an application route.

See [`auth-session-bootstrap.md`](./auth-session-bootstrap.md).

## Current Content Lifecycle

- `proxy` is the only service that talks to TMDB, IGDB, Spotify, and
  OpenLibrary.
- `core` persists `ContentItem` plus per-type detail tables.
- The canonical read path for `source_data` is local-first:
  fresh local detail -> stale local response with `is_stale=true` plus a
  bounded background single-flight refresh -> synchronous proxy fetch
  only when no usable local payload exists.
- Content detail preloads the current user's rating and serializes it in
  the same response, avoiding a second browser waterfall.
- Anonymous content detail uses the same local-first payload but always
  serializes `current_user_rating: null`. A signed, opaque visitor
  fingerprint keeps the historical anonymous quota isolated per browser
  instead of grouping all traffic under the Web service IP; untrusted
  direct traffic falls back to an IP bucket.
- Homepage and multi-search use scoped, policy-versioned cache keys.
  Homepage supports fresh/stale cache reads and single-flight refresh;
  provider calls have bounded retries, circuit breaking, and aggregate
  deadlines.
- Periodic refresh uses `CONTENT_REHYDRATION_POLICY`, including
  SQL-side `refresh_due_at` selection and age-band-aware logging.

See [`content-lifecycle.md`](./content-lifecycle.md).
Discovery filtering is defined in
[`content-eligibility.md`](./content-eligibility.md).
Automatic discovery always applies the safe policy. Authenticated users
may opt into reliably classified adult results only for deliberate
direct search; both provider and aggregate caches isolate that policy.

## Current Personal Tracking And Public Surface

- One tracking row exists per user and canonical content item, with
  backlog, in-progress, completed, on-hold, and dropped states.
- Rating writes auto-complete. Leaving completed inactivates the
  preserved rating/review; returning reactivates it.
- Favorites are completed-only, separate from score, and capped at five
  preserved favorites per canonical content type.
- Seasons canonicalize to a locally persisted parent TV show before a
  tracking write; the write path never synchronously calls `proxy`.
- Public profile overview and tab endpoints use local content summaries,
  stable pagination, bounded filters, a public-IP throttle, query-count
  budgets, and zero provider calls.
- The public-profile loader fetches overview and the active tab in
  parallel and serializes initial query data so SSR and the first client
  render stay identical.
- The additive rollout uses the idempotent
  `backfill_public_profiles_tracking` command. See
  [`../runbooks/public-profile-tracking-backfill.md`](../runbooks/public-profile-tracking-backfill.md).

## Canonical Supporting Docs

- Contracts: [`../contracts/internal-http.md`](../contracts/internal-http.md)
- Observability: [`../observability.md`](../observability.md)
- Performance baseline: [`../perf/baseline.md`](../perf/baseline.md)
- Workspace operation: [`../workspace-operating-model.md`](../workspace-operating-model.md)
- Browser verification:
  [`../runbooks/browser-e2e-and-baseline.md`](../runbooks/browser-e2e-and-baseline.md)
- Open work: [`../roadmap/open-plans.md`](../roadmap/open-plans.md)
- Public catalog boundary:
  [`../adr/0004-public-catalog-auth-boundary.md`](../adr/0004-public-catalog-auth-boundary.md)
