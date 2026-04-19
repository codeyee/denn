# Performance Baseline

This document is the source of truth for performance expectations on the main request paths. Every row is a measurement, not an opinion. The process is part of the contract: if a number is undocumented, treat it as inexistent.

## How to reproduce

### Backend (Django)

1. Make sure the local stack is up: `./.scripts/workspace-dev.sh up`.
2. Enable the per-request perf instrumentation:
   `export PERF_LOGGING_ENABLED=true` and restart `core` so the env
   var is picked up. The middleware is documented in
   `core/core/middleware/perf_timing.py`.
3. Hit the endpoint a few times to warm caches, then run the load:

       hey -n 50 -c 5 -m GET \
           -H "Authorization: Bearer <token>" \
           http://localhost:8000/api/content/lists/

   Replace `hey` with `ab` if you do not have it installed
   (`apt install apache2-utils`).
4. Read p50/p95 from `hey`'s output and pull `query_count`,
   `db_time_ms`, `proxy_time_ms`, `proxy_calls` from the JSON
   `http_request` log lines emitted by `AccessLogMiddleware`.
5. Record the results in the table below.

Tips:
- Restart `core` between scenarios that warm in-process caches if you
  want to measure a cold path.
- If a row needs a specific `n`, prepare the fixture once with a
  management command or a test factory and reuse the list ID.

### Frontend (Next.js)

1. Start `web` in production mode for representative numbers:
   `cd web && npm run build && npm start`.
2. Open Chrome DevTools → Performance → "Web Vitals" overlay
   (or the Lighthouse panel for a one-shot report).
3. Navigate the flow described in the row, capture LCP, INP, CLS,
   TTFB, FCP. The values are also emitted to the browser console by
   `WebVitalsReporter` (`web/app/_components/common/WebVitalsReporter.tsx`)
   and POSTed to `/api/perf/vitals` in production builds.
4. Record p75 across at least 5 cold loads (Cmd+Shift+R) per row.

## Tables

The "before" column captures the earlier known baseline before the current optimization work. Additional columns can be added as measurable changes land. Numbers should be filled in before the PR ships; rows still showing `_TBD_` block the PR per the checklist below.

### Backend endpoints

| Endpoint | Conditions | p50 (ms) before | p95 (ms) before | query_count | proxy_time_ms | p50 after 8B | p95 after 8B | Notes |
|---|---|---|---|---|---|---|---|---|
| `GET /api/content/lists/` | authenticated user with 5 lists | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: p95 < 250 ms |
| `GET /api/content/lists/<id>/` | list with 20 items, source_data=true | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: p95 < 400 ms warm |
| `GET /api/content/lists/<id>/items/?page_size=100` | list with 100 items | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: p95 < 400 ms warm / < 1500 ms cold |
| `GET /api/content/<id>/?include_source_data=true` | warm proxy cache | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: p95 < 200 ms warm / < 600 ms cold |
| `GET /api/content/search/?q=matrix` | aggregate search | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: p95 < 1200 ms |

### Frontend flows

| Flow | LCP (p75) before | INP (p75) before | TTFB before | FCP before | CLS before | LCP after 8C | INP after 8C | Notes |
|---|---|---|---|---|---|---|---|---|
| Hard refresh `/` (home) | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: LCP < 2500, INP < 200, CLS < 0.1 |
| Open `/content/[id]` from a card click | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: LCP < 2500 (with hover prefetch < 1800), CLS < 0.1 |
| Open `/lists/[id]` for a 100-item list | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: LCP < 3000, INP < 200 |

## Acceptable Thresholds

These are the targets the performance program commits to. A PR that regresses any of them needs an explicit "yes, this is acceptable" sign-off in the description.

### Backend (per request)

| Metric | Endpoint | Threshold | Source |
|---|---|---|---|
| p95 latency | `GET /api/content/lists/` | < 250 ms | `hey` p95 |
| p95 latency | `GET /api/content/lists/<id>/items/?page_size=100` | < 400 ms warm, < 1500 ms cold | `hey` p95 |
| p95 latency | `GET /api/content/<id>/` | < 200 ms warm, < 600 ms cold | `hey` p95 |
| p95 latency | `GET /api/content/search/?q=...` | < 1200 ms | `hey` p95 |
| query_count | any list endpoint | <= 10 (else justify) | `http_request` log |
| proxy_calls | any list endpoint | <= 2 per request | `http_request` log |
| proxy_time_ms | any single endpoint | <= 500 ms p95 | `http_request` log |

### Frontend (per flow, p75 across 5 cold loads)

| Metric | Threshold | Source |
|---|---|---|
| LCP | < 2500 ms ("good") | Web Vitals reporter |
| INP | < 200 ms ("good") | Web Vitals reporter |
| CLS | < 0.10 ("good") | Web Vitals reporter |
| TTFB | < 800 ms ("good") | Web Vitals reporter |
| FCP | < 1800 ms ("good") | Web Vitals reporter |

If a flow exceeds a threshold, the PR description must call it out
explicitly under a "Performance impact" heading.

## Notes For Local-First Comparison

If the local-first detail model changes materially, re-measure the same rows into a new comparison column so the impact is auditable.
