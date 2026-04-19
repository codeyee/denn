# Open Plans

This file summarizes the work that is still open, partially implemented, or next in line. Detailed execution notes stay in `sprints/`.

## Priority Order

1. Finish the frontend server-state migration and SSR prefetch path.
2. Close the remaining auth/session hardening gaps.
3. Turn performance documentation into measured, maintained baseline
   data.
4. Replace static content rehydration TTLs with a dynamic policy.

## Performance Baseline And Perceived Speed

- Status: partial
- Detailed plan: see the performance plan under `.docs/sprints/`.

Already merged:

- `core` perf timing middleware behind `PERF_LOGGING_ENABLED`.
- Structured `http_request` logging enriched with DB/proxy timing.
- `WebVitalsReporter` mounted in `web`.
- Query provider, base query hooks, hover prefetch, and optimistic
  mutations foundation.

Still open:

- Fill `perf/baseline.md` with real before/after numbers instead of
  placeholders.
- Generalize streaming/prefetch patterns to the main user flows.
- Make performance verification a maintained engineering habit instead of a one-off planning artifact.

## React Query Migration And SSR Prefetch

- Status: partial
- Detailed plan: see the frontend data-layer migration plan under `.docs/sprints/`.

Already merged:

- Global `QueryProvider`.
- Shared `queryKeys`.
- Base read hooks for lists, list items, and content detail.
- Critical mutations and hover-prefetch primitives.

Still open:

- Migrate Home, Search, List Detail, Add-to-List, and remaining rating
  flows off legacy store-driven fetch logic.
- Remove manual TTL caching from `lists-store` and `content-store`.
- Add server-side prefetch with `HydrationBoundary` for major routes.

## Client Session Bootstrap And Continuity

- Status: partial
- Detailed plan: see the auth continuity plan under `.docs/sprints/`.

Already merged:

- Session resolution moved to `RootLayout`.
- Global `AuthSessionBootstrap`.
- `needsCookieSync` cleanup path.
- `ProtectedRoute` boot guard for the store hydration race.

Still open:

- Add Next middleware for server-side redirects on protected routes.
- Add automated regression coverage for hard refresh, stale cookies, and
  backend-down cases.
- Finish the documentation and observability around the bootstrap
  window.

## Dynamic Content Rehydration Policy

- Status: planned
- Detailed plan: see the dynamic rehydration plan under `.docs/sprints/`.

Current reality:

- Rehydration already exists.
- Freshness still depends on static `CONTENT_REHYDRATION_TTL` by content
  type.

Work to land:

- Introduce `compute_refresh_policy(...)`.
- Replace static TTL decisions with dynamic age/type-aware policy.
- Keep the selection logic in SQL for the periodic refresh command.
- Document and observe the new policy.

## Further Auth Hardening

Independent of the bootstrap work, ADR 0002 phases 2 and 3 are still
open:

- Move to `HttpOnly` auth cookies.
- Add a BFF-mediated auth flow in `web`.
- Remove JS-managed auth cookies and in-memory token plumbing from
  normal client code.

Reference:
[`../adr/0002-web-auth-cookies.md`](../adr/0002-web-auth-cookies.md)
