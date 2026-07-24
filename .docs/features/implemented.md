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
  cards.
- Global session bootstrap plus route-level protected redirects in
  TanStack Router for authenticated pages.
- Deterministic production-build Playwright fixtures, desktop/mobile
  critical-flow smoke, expected-failure audit characterization, redacted
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
