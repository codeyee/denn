# Open Plans

This file summarizes the work that is still open, partially implemented, or next in line. Detailed execution notes stay in `sprints/`.

## Priority Order

1. Preserve the completed Phase 1 and Phase 2 gates from roadmap epic
   [#35](https://github.com/codeyee/denn/issues/35): critical-path
   stabilization plus semantic media, accessibility, responsive UX,
   controlled hero behavior, and real legal/support routes.
2. Complete the remaining content-preference work in #32 before product
   work expands the same discovery surfaces.
3. Execute Phase 3 auth hardening from #19, then the Phase 4
   staging/cache validation and deployed smoke gate.
4. Resume the product sprint line only after the roadmap release gates
   that protect the same critical routes are met.

## Post-Audit Remediation Roadmap

- Status: Phases 0–2 implementation complete; Phases 3–4 remain open.
- Epic: [#35](https://github.com/codeyee/denn/issues/35).
- Phase 0 evidence:
  [`../perf/baseline.md`](../perf/baseline.md),
  [`../observability.md`](../observability.md), and
  [`../runbooks/browser-e2e-and-baseline.md`](../runbooks/browser-e2e-and-baseline.md).

Phase 0 established the before evidence rather than repairing the known
failures: one logical request ID, cache/data-source dimensions,
production-build browser smoke, cold/warm baseline, redacted failure
artifacts, and expected-failure characterization for #17, #18 and #20.
Phase 1 promoted those quarantined scenarios to passing regression
tests. Its durable outcomes are:

- transient auth failures no longer destroy a known session;
- discovery resolves stable ids in bulk and hover/focus performs no
  writes;
- stale detail returns immediately and current-user rating is bundled;
- provider and aggregate requests have explicit budgets, scoped caches,
  single-flight refresh, retry/circuit behavior, and fail-open cache
  handling;
- the critical path has immediate feedback and an accessibility base.

The epic itself remains open because its Definition of Done also covers
Phases 3–4.

Phase 2 added a shared semantic responsive-media path, requests only the
active hero artwork, lazily loads card media, and reserves stable image
dimensions. The featured carousel now has pause/resume, interaction
pause, reduced-motion behavior, stable geometry, and roving tab stops.
The critical routes have one main landmark and one H1, route-change
focus, semantic navigation, named controls, contrast fixes, and 44px
primary targets. Mobile search, native horizontal carousel scrolling,
the 320–1440px reflow matrix, legal/support routes, canonical metadata,
hard-refresh behavior, and coherent 404 handling are covered by the
production-build Playwright suite. Exact Web Vitals and media-request
evidence live in [`../perf/baseline.md`](../perf/baseline.md).

## Old TODO Triage

- Status: integrated into existing sprint plans.
- Source: legacy frontend/backend TODO lists reviewed against the
  current `.docs/` state.

Decisions:

- Metadata eligibility, future-release filtering, invalid season
  filtering and lowercase search cache keys belong in `Sprint 10` because
  they are part of the content freshness and provider-normalization path.
- Completion/rating prompts, current-user rating consolidation, decimal
  rating precision and favorite semantics belong in `Sprint 11` because
  they depend on first-class personal tracking.
- Owner-as-member, Add-to-List list metadata, checkbox-style list
  membership and the random pending picker belong in `Sprint 12` because
  they depend on the final list membership and permission model.
- Gallery lightbox and route metadata belong in `Sprint 13`; final
  typography, color and responsive QA belongs in `Sprint 16`.

Closed or intentionally not reopened:

- Random list names, list-item notes removal, duplicate list-item
  validation, member rating aggregates, bulk list membership checks,
  proxy multi-search and frontend where-to-play image mapping are already
  implemented in the current codebase.
- Do not reintroduce `page_size=0` as the public "fetch all" contract;
  keep using the explicit unpaginated/full-query contract already
  documented in history.
- Do not add N-level list grouping, Google SSO, private ratings,
  follow/feed/comments/importers or public directories in the current MVP
  sprint line unless a later product review reopens them.

Validation expectation:

- Web changes from the legacy TODOs require `make validate-web` plus
  manual checks for Search stale results, Add-to-List on small screens,
  list pagination without empty flashes, card hover behavior and rating
  prompts.
- Backend/proxy changes require `make validate-core` and
  `make validate-proxy`, with focused tests for season filtering, owner
  membership, duplicate item validation, bulk list checks, lowercase
  search cache keys and release-date eligibility.
- Any touched request path must update or explicitly confirm
  `.docs/perf/baseline.md`.

## Product Gap Analysis Toward A Social Multi-Media Tracker

- Status: planned
- Detailed review:
  [`./2026-04-19-social-multimedia-tracker-review.md`](./2026-04-19-social-multimedia-tracker-review.md)
- Validated MVP functional design:
  [`./2026-04-20-mvp-functional-design.md`](./2026-04-20-mvp-functional-design.md)
- Post-foundation feature roadmap:
  [`./2026-04-20-post-foundation-mvp-feature-roadmap.md`](./2026-04-20-post-foundation-mvp-feature-roadmap.md)

Current reality:

- Denn already works as a multi-media catalog plus ratings plus shared
  list application.
- It is still missing the first-class tracking model, public social
  surface, and community loops required to feel like a Letterboxd- or
  RYM-style social tracker.

Product work to land:

- Introduce a dedicated tracking model separate from list membership.
- Define public visibility for profiles, lists, and content pages.
- Build real profile pages from existing backend profile data.
- Separate ratings from tracking state and favorites cleanly.
- Add public catalog, profile, list, and leaderboard surfaces in a
  coherent rollout order.
- Keep follow relationships, feed, import/export, and richer stats as
  post-MVP product work.

Detailed sprint plans:

- [`../sprints/sprint-11-personal-tracking-1-0.md`](../sprints/sprint-11-personal-tracking-1-0.md)
- [`../sprints/sprint-12-lists-2-0.md`](../sprints/sprint-12-lists-2-0.md)
- [`../sprints/sprint-13-public-catalog-1-0.md`](../sprints/sprint-13-public-catalog-1-0.md)
- [`../sprints/sprint-14-public-profiles-1-0.md`](../sprints/sprint-14-public-profiles-1-0.md)
- [`../sprints/sprint-15-leaderboards-1-0.md`](../sprints/sprint-15-leaderboards-1-0.md)
- [`../sprints/sprint-16-public-safety-and-mvp-launch-hardening.md`](../sprints/sprint-16-public-safety-and-mvp-launch-hardening.md)

## Performance Baseline And Perceived Speed

- Status: Phase 1 local after-snapshot recorded; deployed
  after-measurement remains a release-gate activity.

Implemented baseline:

- `core` perf timing middleware behind `PERF_LOGGING_ENABLED`.
- Structured `http_request` logging enriched with DB/proxy timing.
- `WebVitalsReporter` mounted in `web`.
- Query provider, base query hooks, hover prefetch, and optimistic
  mutations foundation.
- p50/p75/p95 fixture measurements for login, home, search, detail,
  lists and profile in cold/warm browser states.
- Request correlation, bounded cache/data-source fields, alert
  thresholds, weekly/manual browser job and redacted Playwright
  artifacts.

Still open:

- Generalize streaming/prefetch patterns to the main user flows.
- Capture comparable deployed after-measurements during Phase 4 without
  replacing the existing before snapshot or fixture floor.

## React Query Migration And SSR Prefetch

- Status: implemented, with follow-up testing depth remaining.

Merged behavior:

- Home, Search, Content Detail, List Detail, Add-to-List, ratings, and
  list mutation flows use TanStack Query for server state.
- Legacy `lists-store` and `content-store` server-response caches were
  removed.
- Major routes prefetch server-side into the per-request `QueryClient`,
  and the router rehydrates that cache on the client.

Still open:

- Expand frontend interaction coverage beyond the current Query smoke
  tests.

## Dynamic Content Rehydration Policy

- Status: implemented, with rollout follow-up
- Detailed plan: see the remaining dynamic rehydration follow-up plan
  under `.docs/sprints/`.

Current reality:

- Rehydration already exists.
- Freshness now depends on `CONTENT_REHYDRATION_POLICY`, using
  release-date bands and SQL-side stale selection.
- Country-scoped platform availability is already stored separately, but
  it still lacks an independent freshness lifecycle.
- `core` still carries some provider-shaped fields that should be
  reduced before `Sprint 11`, especially external `status` semantics.

Work to land:

- Use the normalization/reporting command during rollout to avoid a
  first-run spike.
- Rebaseline performance and ops guidance once real measurements are
  collected.
- Split or supplement the current detail freshness model so platform
  availability can refresh independently per country.
- Close the remaining homepage future-release leak so `Popular` buckets
  do not surface items months ahead of release.
- Remove or isolate provider-derived `status` fields so the persisted
  domain model keeps converging toward Denn-owned semantics.

## Further Auth Hardening

Independent of the bootstrap work, ADR 0002 phases 2 and 3 are still
open:

- Move to `HttpOnly` auth cookies.
- Add a BFF-mediated auth flow in `web`.
- Remove JS-managed auth cookies and in-memory token plumbing from
  normal client code.

Reference:
[`../adr/0002-web-auth-cookies.md`](../adr/0002-web-auth-cookies.md)
