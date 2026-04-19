# Contributing

Welcome. This document collects the lightweight conventions every PR in
the Denn monorepo is expected to follow. The performance section below
was introduced in Sprint 08 and is mandatory for any PR that touches a
request path (backend view, frontend page, proxy call) or its
dependencies.

## Pre-merge performance checklist

Before requesting review, confirm each item below in the PR
description. Tick the ones that apply; explicitly mark the others as
`N/A` (do not omit them silently).

### Backend (Django) — `core`

- [ ] **No N+1 ORM queries.** New or modified DRF views/serializers
      use `select_related` / `prefetch_related` where required.
      `assertNumQueries` test added or updated when the budget changes.
- [ ] **No N+1 proxy calls.** Any new code path that needs
      `ProxyAPIClient` data uses bulk endpoints / `source_data_cache`
      pre-population (see `ContentItemViewSet.list` for the pattern).
- [ ] **Query budget respected.** With `PERF_LOGGING_ENABLED=true`,
      hit the touched endpoints and check the `http_request` log:
      `query_count <= 10` for list endpoints (else justify in PR).
- [ ] **Proxy budget respected.** `proxy_calls <= 2` and
      `proxy_time_ms <= 500` p95 for any single request.
- [ ] **Latency thresholds met.** Any endpoint whose p95 you can
      measure stays within the limits in `docs/perf/baseline.md`.
- [ ] **Timeouts and parallelism unchanged or justified.**
      `PROXY_GET_TIMEOUT`, `PROXY_BULK_TIMEOUT`,
      `TMDB_SEASONS_MAX_WORKERS` are not lowered without a reason.

### Frontend (Next.js) — `web`

- [ ] **Web Vitals not regressed.** Run a production build
      (`cd web && npm run build && npm start`) and verify in Chrome
      DevTools that LCP/INP/CLS for the touched flows still pass the
      thresholds in `docs/perf/baseline.md`. The console will print
      the colored Web Vitals lines from `WebVitalsReporter`.
- [ ] **No CLS introduced.** New loading states use a dimensionally
      stable skeleton (see `ContentDetailSkeleton` for the pattern).
      `loading.tsx` is added when a route does not have one.
- [ ] **Server reads use TanStack Query.** New data reads go through
      `useQuery` hooks in `web/lib/api/queries/` (do not reach for
      `useEffect` + `fetch`). Reuse `queryKeys` from
      `web/lib/api/queries/keys.ts`.
- [ ] **Mutations are optimistic + reversible.** New mutations use
      one of `web/lib/api/mutations/` (or follow the same
      `onMutate` / `onError` / `onSettled` shape) so failures roll
      back the UI and surface a toast.
- [ ] **Hover prefetch where useful.** Cards that link to a detail
      page wire `useHoverPrefetch` + `usePrefetchContentDetail`
      (see `ContentCard`, `ListItemCard`).
- [ ] **`<Link prefetch>` not disabled.** Internal navigation uses
      Next.js `<Link>` with the default prefetch behaviour. Only
      disable it with a written justification.

### Documentation

- [ ] **`docs/perf/baseline.md` updated** when:
      - a new endpoint or flow is added,
      - an existing measurement materially changes (>20%),
      - a threshold is renegotiated.
- [ ] **PR description includes a "Performance impact" section** if
      any of the boxes above are unchecked or marked `N/A`, explaining
      why.

## How to measure quickly

- Backend p50/p95: `hey -n 50 -c 5 ...` or `ab -n 100 -c 5 ...`
- Backend per-request metrics: tail `core` logs with
  `PERF_LOGGING_ENABLED=true` and look at the `http_request` JSON
  lines (`query_count`, `db_time_ms`, `proxy_time_ms`, `proxy_calls`).
- Frontend Web Vitals: open the page in a production build and read
  the colored lines printed by `WebVitalsReporter` in the browser
  console, or check the values that show up in the Lighthouse panel.

When in doubt, the operating procedure is "measure twice, ship once".
