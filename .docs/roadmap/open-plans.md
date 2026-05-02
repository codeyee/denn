# Open Plans

This file summarizes the work that is still open, partially implemented, or next in line. Detailed execution notes stay in `sprints/`.

## Priority Order

1. Close the remaining `Sprint 10` follow-up work: future-release
   filtering leak, country-scoped availability freshness, and provider
   status cleanup.
2. Prepare the repo for `Sprint 11` by keeping the persisted content
   model aligned with Denn-owned semantics rather than provider-shaped
   vocabularies.
3. Turn performance documentation into measured, maintained baseline
   data.
4. Keep ADR 0002 auth hardening visible, but behind the content/domain
   cleanup needed before the product-heavy sprint line continues.

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

- Status: partial

Already merged:

- `core` perf timing middleware behind `PERF_LOGGING_ENABLED`.
- Structured `http_request` logging enriched with DB/proxy timing.
- `WebVitalsReporter` mounted in `web`.
- Query provider, base query hooks, hover prefetch, and optimistic
  mutations foundation.

Still open:

- Fill `perf/baseline.md` with real current measurements instead of
  placeholders.
- Generalize streaming/prefetch patterns to the main user flows.
- Make performance verification a maintained engineering habit instead of a one-off planning artifact.

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

- Replace placeholder values in `.docs/perf/baseline.md` with measured
  current Web Vitals.
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
