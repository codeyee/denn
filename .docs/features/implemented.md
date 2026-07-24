# Implemented Features

This file describes functionality that is already merged and should be
considered part of the project baseline.

## Product Capabilities

- User authentication with login, registration, logout, and protected
  routes.
- Homepage and multi-source discovery across movies, TV shows, games,
  albums, and books.
- Search flow with typed result transformation per media family.
- Content detail pages routed by internal Denn content id.
- User profile page.
- Personal and shared lists with items, members, invitations, ratings,
  and list-item status workflows.
- List exploration with backend query model for filters, range filters,
  multi-field sort, grouping, and stable pagination.
- Canonical list ordering plus "apply current sort as list order".
- Add-to-list, reorder, toggle-status, and rating workflows.

## Platform Foundations

- Canonical hybrid metadata topology formalized by ADR 0001.
- Canonical internal HTTP contract for headers, error envelope,
  pagination, env var ownership, and request-id propagation.
- Structured logging and bounded request correlation across `web`,
  `core` and `proxy`, including cache/data-source state and payload
  timing without user identifiers.
- Deterministic root validation workflow via `make validate-web`,
  `make validate-core`, and `make validate-proxy`.
- Local-first content detail persistence in `core` with per-type detail
  tables and proxy-shaped payload reconstruction.
- Periodic rehydration command for persisted content details.
- Dynamic content rehydration policy by age/type, including SQL-side
  stale selection and rollout normalization tooling.
- `browse_metadata` derived model to support list exploration and
  canonical ordering.
- Global frontend query provider, query-key factory, extracted query
  hooks/mutations, and server-side prefetch for the main frontend flows.
- Hover prefetch for detail navigation from content cards and list item
  cards, using semantic links and pure reads after discovery resolves
  stable ids in one bulk `core` request.
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
  priority LCP image.
- Accessible featured-content carousel with user pause/resume,
  focus/hover pause, reduced-motion opt-out, roving tab stops, stable
  geometry, and delayed loading of inactive artwork.
- Responsive mobile search, touch/keyboard horizontal carousels, and
  verified 320–1440px plus landscape reflow without horizontal
  overflow.
- Real About, Privacy, Terms, and Contact routes with route metadata,
  canonical links, hard-refresh support, an operational contact
  channel, and a coherent application 404.
- Deterministic production-build Playwright fixtures, desktop/mobile
  critical-flow smoke, promoted auth/navigation regression coverage,
  automated axe coverage across critical and legal routes, responsive
  and keyboard checks, sub-100ms navigation-feedback checks, redacted
  browser failure artifacts and a scheduled cold/warm baseline.

## Current Compatibility Guarantees

- `proxy` is the only owner of upstream provider credentials.
- `PROXY_API_KEY` remains server-only.
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
