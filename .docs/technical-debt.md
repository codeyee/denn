# Technical Debt

Only active debt belongs here. Resolved issues should be removed once
their lasting outcome is reflected in architecture or history docs.

## High

- Cross-service typed contract generation is still duplicated across
  `web` and `core`; there is no generated shared client or schema layer.
- Frontend Query migration has production-build smoke coverage for the
  critical routes, but Add-to-List and ListDetail still need broader
  mutation/rollback interaction tests.
- Adult search preference and cache isolation are implemented. IGDB,
  Spotify, and OpenLibrary still have no provider adult flag (only an IGDB
  ESRB `AO` rating overrides; other ratings, keywords, and subjects are context
  for Jev). Jev classifies their items when moderation is enabled, and search
  and Browse cards blur current explicit artwork, but search never calls Jev
  at request time and results that are not yet classified stay visible and
  unblurred. Denn must not infer safety from free text.
- Country-scoped streaming availability is persisted separately, but
  freshness is still tied to the global content detail lifecycle instead
  of an independent per-country policy.
- `core` still persists some provider-derived semantics such as external
  `status`, which pulls the local model toward upstream vocabularies
  instead of a Denn-owned domain shape.

- Jev moderation workers have not been validated for multi-instance
  concurrency and persistence fencing on PostgreSQL; run one replica of
  each. Their per-process batch and polling bounds are not a global
  provider-call or cost cap.
- A strict homepage can be thin while classification catches up. Only
  current `complete`/`safe` items are shown, so after activation, a source
  change, or a model or question-revision bump a category can be short or
  empty until the workers classify its candidates. The bulk resolver admits
  that work itself, but its speed is bounded by worker polling and the
  single-replica worker limit, and there is no global cap on queued
  moderation jobs.
- Proxy's 5-minute homepage candidate cache and Web's 5-minute query stale
  time delay homepage changes after a new judgment. Search and Browse query
  keys do not include the visibility flag, so an open client keeps old
  summaries across a flag change until it reloads.
- Moderation blur does not yet cover every artwork surface: random-pick modal
  artwork, list and dynamic-collection cover collages, season cards on a show's
  detail page, and Add-to-list season thumbnails carry no per-image summary or
  no blur. Row layouts blur without a reveal control.

## Medium

- Some frontend coordination modules remain large and still mix loading,
  transformation, and orchestration concerns.
- `web/src/components/pages/ContentDetailPage/index.tsx` exceeds the
  200-line component limit and needs its orchestration, hooks, and
  presentation split.
- Jev evaluation tooling is larger than what the 2026-09-28 catalog
  evaluation used: the gold-case schema, metrics/accounting modules and the
  25-case live evaluator report only composed decisions, while the run
  needed raw probabilities from a one-off script. Consolidate or prune it
  when evaluations become recurring.
- Automated axe, keyboard, responsive, and touch-target coverage now
  protects the critical and legal routes. Less-used application
  surfaces still need the same coverage as they are changed.
- `browse_metadata` has a working base model, but its refresh strategy
  is still lighter than the main local detail lifecycle.
- The deployed Home after-snapshot closed the roadmap's operational
  measurement gap, but cold browser TTFB remains above the initial
  800 ms warning threshold at p75 (891.8 ms) and p95 (1,091.2 ms).
  Warm p75 is 435.5 ms and proxy MISS/HIT budgets pass, so further work
  should target authenticated SSR/session and delivery overhead rather
  than reopening the aggregate-cache implementation.

## Notes

- This document is the working set for debt that still matters.
- Historical diagnostics from the original audit were intentionally
  absorbed into this file, the roadmap, and the architecture docs so
  they do not live on as parallel narratives.
