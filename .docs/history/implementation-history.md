# Implementation History

This document keeps the durable outcomes of completed implementation plans after their verbose execution docs have been retired.

## Foundation, CI, And Quality Gates

- The repo became a real monorepo with one root CI surface and shared
  root workflows.
- `web` lint and production build were stabilized.
- `proxy` default tests became deterministic and offline-safe.
- Root operational documentation and validation commands were defined.

## Home/Search Server-First Direction

- Home and Search moved away from the original fully client-driven
  waterfall pattern.
- A session bridge based on server-readable cookies enabled server-first
  behavior on authenticated routes without reworking the full auth
  system.
- The groundwork for the later global session bootstrap was established.

## List Detail Performance Cleanup

- Normal list viewing stopped requiring a full dataset fetch by default.
- Reorder flows became explicit instead of being coupled to normal
  browsing.
- The list pipeline moved toward a clearer viewer/editor split.

## List Detail Hardening

- The transitional list-detail UX was cleaned up and made less implicit.
- The main List Detail module was decomposed and its automatic full-data
  promotion behavior was reduced.
- Manual validation for long-list behavior became part of the closure
  criteria.

## Core Contracts, Invariants, And Serialization

- Fragile content/list contracts in `core` were tightened.
- List-domain invariants moved closer to model/database ownership.
- Query and serialization cost for list and rating paths was reduced.
- `page_size=0` was replaced by an explicit `unpaginated=true` path.

## List Query Model And Browse Metadata

- `core` gained a formal list-item query model for filters, range
  filters, sort, and grouping.
- `ContentItemBrowseMetadata` became the read model that powers list
  exploration.
- The frontend split temporary explore state from canonical list order.
- "Apply sort as list order" became a first-class workflow with
  guardrails.

## Proxy Reliability

- Proxy test coverage was stabilized so `go test ./...` became a usable
  default gate again.
- Retry/fallback behavior was clarified by endpoint and failure type.
- Aggregation endpoints such as `/homepage` and `/search` were reviewed
  for payload and cache behavior.

## Integration, Contracts, And Observability

- ADR 0001 formalized the hybrid metadata topology.
- ADR 0002 documented the phased migration away from JS-readable auth
  storage, with phase 1 implemented.
- The internal HTTP contract was written down and aligned with code.
- Structured logs and `X-Request-Id` correlation became shared
  cross-service behavior.
- Root documentation stopped contradicting the actual service
  boundaries.

## Local-First Content Persistence And Stable Public IDs

- `core` gained per-type detail tables and supporting child/catalog
  models.
- Local payload reconstruction became the canonical read path for
  content detail.
- The periodic `rehydrate_content_details` workflow was introduced.
- Public navigation moved to id-first content routes.
- The legacy external triple route remained only as a compatibility
  bridge.

## React Query Migration And SSR Prefetch

- Frontend server state moved onto TanStack Query across Home, Search,
  Content Detail, ratings, Add-to-List, and List Detail flows.
- The legacy `lists-store` and `content-store` response caches were
  removed, leaving Zustand for client and UI state instead of remote
  reads.
- Major routes began prefetching on the server and hydrating with
  `HydrationBoundary`, reducing first-load waterfalls on authenticated
  pages.
- Query keys, read hooks, and mutation invalidation became the
  canonical frontend data-fetching pattern.
- The data-fetching architecture and performance baseline docs were
  updated to reflect the new model and the remaining measurement work.

## What This History Replaces

The detailed execution plans were intentionally removed after their durable outcomes were extracted here and into the architecture, features, debt, and roadmap docs.
