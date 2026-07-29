# Implemented Features

This file describes functionality that is already merged and should be
considered part of the project baseline.

## Product Capabilities

- User authentication with login, registration, logout, logout-all, and
  protected routes through a same-origin BFF. JWTs remain in
  `HttpOnly`/`Secure`/`SameSite=Lax` cookies, mutations require CSRF, and
  the browser stores identity only.
- Public homepage and multi-source discovery across movies, TV shows,
  games, albums, and books; authentication adds personal lists.
- Public search with typed result transformation per media family.
- Public content detail pages routed by internal Denn content id, with
  aggregate rating data but no anonymous personal state.
- Shared responsive login and registration shell using Denn's
  cover-gallery identity; the retired `/welcome` path resolves through
  the standard not-found experience. Confirmed authenticated sessions
  are redirected away from `/login` and `/register` to Home.
- Login-on-action for Add-to-List and Rating with a return path shared
  across login and registration.
- Avatar-based authenticated profile navigation.
- Stable public identity at `/user/<username>` with editable bio/avatar,
  joined date, counters, score-sorted combined favorites with
  multi-select media filters, recent completions and reviews, author
  attribution, panoramic favorite artwork, owner-selected favorite banner
  artwork with gallery/poster alternatives, public-list modules, and an
  owner-only edit modal that reflects saved changes immediately.
- Private account preferences and session actions at `/settings`;
  `/profile` is intentionally absent.
- First-class personal tracking with backlog, in-progress, completed,
  on-hold, and dropped states, including rating activation semantics and
  completed-only favorites.
- Dynamic system lists: configurable, tracking-populated `UserList` records by
  progress state or content type (with TV shows and seasons together). They
  reuse the normal list cards and detail route, keep membership read-only while
  allowing custom order, and provide a backlog-only random picker for type
  lists.
- Unified public Progress tab with multi-select media/status filters,
  reversible criterion-based sorting, grid/list views, and icon menus;
  paginated public Lists remain separate.
- Anonymous content-detail and public-list reads, with private lists
  returning 404 to outsiders.
- Game detail pages expose optional IGDB time-to-beat estimates for rushed,
  normal, and complete playthroughs, preserving IGDB's source semantics.
  Values above 3,000 hours are discarded, and contradictory estimates retain
  only the normal value across proxy normalization, local persistence, payload
  reconstruction, and the frontend display. Existing game details without a
  duration record are rehydrated on demand and by the periodic rehydration
  command.
- Personal and shared lists with items, members, invitations, ratings,
  and list-item status workflows.
- Personal-list additions seed missing personal progress as `backlog` while
  preserving existing state; shared-list additions remain contextual only.
- List exploration with backend query model for filters, range filters,
  multi-field sort, grouping, and stable pagination.
- Canonical list ordering plus "apply current sort as list order".
- Add-to-list, reorder, toggle-status, and rating workflows.
- Optimistic, reversible tracking, favorite, rating, and public-profile
  mutations.

## Platform Foundations

- Canonical hybrid metadata topology formalized by ADR 0001.
- Canonical internal HTTP contract for headers, error envelope,
  pagination, env var ownership, and request-id propagation.
- Structured logging and bounded request correlation across `web`,
  `core` and `proxy`, including cache/data-source state and payload
  timing without user identifiers.
- Deterministic root validation workflow via `make validate-web`,
  `make validate-core`, and `make validate-proxy`.
- Reproducible loopback-only local Compose stack for PostgreSQL, Redis,
  `proxy`, `core`, and `web`, with persistent snapshot data, local env
  guardrails, service restarts, HTTP/DB smoke, real-stack Playwright,
  and private env reuse across worktrees.
- Local-first content detail persistence in `core` with per-type detail
  tables and proxy-shaped payload reconstruction.
- Periodic rehydration command for persisted content details.
- Dynamic content rehydration policy by age/type, including SQL-side
  stale selection and rollout normalization tooling.
- `browse_metadata` derived model to support list exploration and
  canonical ordering.
- Global frontend query provider, query-key factory, extracted query
  hooks/mutations, and server-side prefetch for the main frontend flows.
- Viewer-scoped content keys plus username/tab/filter-scoped public
  profile keys, with explicit SSR initial data that avoids first-render
  hydration drift.
- Hover prefetch for detail navigation from content cards and list item
  cards, using semantic links and pure reads after discovery resolves
  stable ids in one trusted server-to-`core` bulk request.
- Viewer-scoped detail caches and server-only prefetch boundaries keep
  anonymous data separate from current-user ratings and prevent client
  navigation from calling internal service URLs.
- Global session bootstrap with bounded deadlines, explicit
  anonymous/expired/operational-failure states, recoverable protected
  routes, and route-level redirects only for confirmed invalid sessions.
- Local-first detail reads that serve stale data immediately while one
  bounded background refresh runs, plus current-user rating data in the
  initial detail response.
- Homepage and search aggregate caches with country/query/policy-scoped
  keys, stale-while-revalidate, single-flight homepage misses, bounded
  provider retries, and circuit breakers.
- General-discovery release eligibility with a 24-hour grace window and
  TMDB adult exclusion before aggregate cache writes.
- Safe-by-default adult-content preference: automatic discovery remains
  filtered, direct search can opt into reliably classified TMDB results,
  policy-specific cache entries prevent cross-user reuse, and the active
  scope is explained in Search and Profile.
- Accessibility foundation for the critical flow: zoomable viewport,
  skip link, one main landmark, semantic card navigation, labeled
  search controls, visible focus behavior, reduced-motion support, and
  44px interactive targets.
- Shared semantic responsive media for hero, cards, episodes, and
  detail banners, with reserved dimensions, provider-aware `srcset`,
  useful alt text, async decoding, lazy non-critical media, and one
  priority LCP image. Banner artwork is format-aware: panoramic media
  remains full-bleed, while poster-only media uses a blurred ambient copy
  and a centered contained foreground across detail, homepage, and profile.
- Accessible featured-content carousel with user pause/resume,
  focus/hover pause, reduced-motion opt-out, roving tab stops, stable
  geometry, and delayed loading of inactive artwork.
- Responsive mobile search, touch/keyboard horizontal carousels, and
  verified 320–1440px plus landscape reflow without horizontal
  overflow.
- Homepage discovery renders up to 30 items in each movie, TV, game,
  music, and book carousel. Shared content metadata supplies the icon
  and label used by category headings, filters, and cards.
- Desktop card previews retain the anchor card's width, follow
  viewport resize, remain viewport-bound, and dismiss on the first page
  or carousel scroll without trapping the wheel. Fast click, keyboard,
  Escape, and touch navigation remain available.
- Real About, Privacy, Terms, and Contact routes with route metadata,
  canonical links, hard-refresh support, an operational contact
  channel, and a coherent application 404.
- Deterministic production-build Playwright fixtures, desktop/mobile
  critical-flow smoke, promoted auth/navigation regression coverage,
  automated axe coverage across critical and legal routes, responsive
  and keyboard checks, sub-100ms navigation-feedback checks, redacted
  browser failure artifacts and a scheduled cold/warm baseline.
- Bounded content-detail failure handling: a slow/failed client read
  exits the skeleton at five seconds, preserves authentication, and
  offers an explicit retry covered by the degraded-browser matrix.
- Production-verified release gate for roadmap #35: exact Web SHA
  exposure, ordered cross-service deployment, Core migrations before
  Gunicorn, dedicated-account headed-browser smoke, exact cache timing,
  and deployed cold/warm Home percentiles.
- Conservative, idempotent public-progress backfill with dry-run reporting
  for username anomalies, duplicates, direct-season coverage, historical
  parent-rating ambiguity, missing metadata, and intentionally omitted
  shared-list completions; missing personal-list progress is seeded as
  `backlog`.

## Current Compatibility Guarantees

- `proxy` is the only owner of upstream provider credentials.
- `PROXY_API_KEY` remains server-only.
- Public discovery resolution uses `PROXY_API_KEY` only between `web`
  and `core`; it is never attached to a browser request.
- Content detail navigation should use the internal content id once it
  exists.
- The cross-service error envelope and `X-Request-Id` flow are stable
  contracts between `core` and `proxy`.

## Where To Look Next

- System snapshot:
  [`../architecture/current-state.md`](../architecture/current-state.md)
- Open work:
  [`../roadmap/open-plans.md`](../roadmap/open-plans.md)
- Active debt:
  [`../technical-debt.md`](../technical-debt.md)
- Implementation timeline:
  [`../history/implementation-history.md`](../history/implementation-history.md)
