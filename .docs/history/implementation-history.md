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
  the per-request `QueryClient`, reducing first-load waterfalls on
  authenticated pages.
- Query keys, read hooks, and mutation invalidation became the
  canonical frontend data-fetching pattern.
- The data-fetching architecture and performance baseline docs were
  updated to reflect the new model and the remaining measurement work.

## Session Continuity On Protected Routes

- Session bootstrap moved fully to the TanStack Start root route and now
  feeds a single global `AuthSessionBootstrap`.
- Protected routes gained route-level SSR redirects plus a cleaner
  client fallback for the bootstrap race and backend-unavailable cases.
- Login gained a safe `next` redirect path so protected deep-links can
  resume after authentication.
- Regression coverage was added around bootstrap, redirect helpers, and
  protected-route client behavior.

## Dynamic Content Rehydration And Discovery Eligibility

- Static per-type TTLs were replaced with a dynamic
  `CONTENT_REHYDRATION_POLICY`.
- `rehydrate_content_details` now selects stale rows by computed
  `refresh_due_at` and reports age-band summaries.
- `normalize_rehydration_timestamps` was added to help stagger rollout
  after policy changes.
- Discovery surfaces in `proxy` now normalize search cache keys and
  filter future/undated general results plus invalid season payloads.

## Phase 0 Post-Audit Guardrails

- The repository gained a production-build Playwright harness backed by
  deterministic, non-personal `core` and `proxy` fixtures.
- Desktop/mobile smoke now covers login/deep-link return, token refresh,
  critical routes, click navigation, hard refresh, keyboard focus,
  request correlation and bounded cache states.
- Audit bugs in auth/session resilience, logout, hydration and hover
  mutation became expected-failure or fixme scenarios with retained,
  redacted failure artifacts.
- One logical request ID now crosses `web`, `core` and `proxy`; structured
  logs separate browser, cache, DB freshness and provider-fetch states
  without JWTs, credentials or user identifiers.
- The placeholder performance document was replaced with a repeatable
  p50/p75/p95 cold/warm fixture baseline, deployed before evidence,
  route thresholds and alert guidance.
- Pull requests run the stable desktop smoke, while a weekly/manual
  workflow regenerates the more expensive baseline and regression
  evidence.

## Phase 1 Critical-Flow Stabilization

- Auth bootstrap gained bounded states for anonymous, expired, timeout,
  and unavailable dependencies. Only explicit invalid credentials clear
  a session; transient failures preserve it and expose retry.
- Discovery now resolves external triples to stable Denn ids in one
  authenticated bulk operation. Semantic card links prefetch via pure
  reads and show immediate click feedback.
- Content detail became stale-while-revalidate with bounded
  single-flight background refresh, and bundles the current user's rating
  into its first response.
- Homepage and multi-search gained complete cache-key scope, policy
  versioning, deadlines, retry/circuit behavior, Redis fail-open, and
  homepage fresh/stale single-flight caching.
- General discovery applies a 24-hour release grace window across media
  families; TMDB also excludes adult content both upstream and from raw
  mapped results.
- The critical browser path gained its accessibility foundation and the
  former Phase 0 expected failures became passing desktop/mobile
  regressions with a measured sub-100ms feedback gate.

## What This History Replaces

The detailed execution plans were intentionally removed after their durable outcomes were extracted here and into the architecture, features, debt, and roadmap docs.
