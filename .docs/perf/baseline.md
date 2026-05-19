# Performance Baseline

This document is the source of truth for performance expectations on the
main request paths. It has two jobs:

- define how measurements must be taken;
- store the latest agreed baseline for the most important flows.

If a value is still `_TBD_`, it is not a baseline yet. Treat it as a
known documentation gap, not as an implicit pass.

## Measurement Rules

### Backend (`core`)

1. Start the local stack with `make up`.
2. Enable request instrumentation in `core`:
   `export PERF_LOGGING_ENABLED=true`
3. Warm the endpoint a few times if the row says "warm".
4. Run a small repeatable load, for example:

   ```bash
   hey -n 50 -c 5 -m GET \
     -H "Authorization: Bearer <token>" \
     http://localhost:8000/api/content/lists/
   ```

5. Record:
   - p50 / p95 latency from `hey`
   - `query_count`
   - `proxy_calls`
   - `proxy_time_ms`
   from the structured `http_request` log lines.

### Frontend (`web`)

1. Build and run production mode:

   ```bash
   cd web
   pnpm run build
   pnpm start
   ```

2. Use Chrome DevTools or Lighthouse on production output only.
3. Capture at least 5 cold loads per flow.
4. Record p75 for:
   - LCP
   - INP
   - CLS
   - TTFB
   - FCP
5. `WebVitalsReporter` console output is acceptable as the source.

## Baseline Tables

### Backend endpoints

| Endpoint | Conditions | p50 current (ms) | p95 current (ms) | query_count | proxy_calls | proxy_time_ms | Notes |
|---|---|---|---|---|---|---|---|
| `GET /api/content/lists/` | authenticated user with 5 lists | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: p95 < 250 ms |
| `GET /api/content/lists/<id>/` | list with 20 items, `source_data=true` | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: p95 < 400 ms warm |
| `GET /api/content/lists/<id>/items/?page_size=100` | list with 100 items | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: p95 < 400 ms warm / < 1500 ms cold |
| `GET /api/content/<id>/?include_source_data=true` | warm proxy cache | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: p95 < 200 ms warm / < 600 ms cold |
| `GET /api/content/search/?q=matrix` | aggregate search | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: p95 < 1200 ms |

### Frontend flows

| Flow | LCP current (p75) | INP current (p75) | TTFB current | FCP current | CLS current | Notes |
|---|---|---|---|---|---|---|
| Hard refresh `/` (home) | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: LCP < 2500, INP < 200, CLS < 0.1 |
| Hard refresh `/search?q=matrix` | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: LCP < 2500, INP < 200, CLS < 0.1 |
| Open `/content/<id>` from a card click | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: LCP < 2500, hover-prefetched target < 1800, CLS < 0.1 |
| Open `/lists/<id>` for a 100-item list | _TBD_ | _TBD_ | _TBD_ | _TBD_ | _TBD_ | Threshold: LCP < 3000, INP < 200 |

## Thresholds

### Backend

| Metric | Scope | Threshold |
|---|---|---|
| p95 latency | `GET /api/content/lists/` | < 250 ms |
| p95 latency | `GET /api/content/lists/<id>/items/?page_size=100` | < 400 ms warm, < 1500 ms cold |
| p95 latency | `GET /api/content/<id>/` | < 200 ms warm, < 600 ms cold |
| p95 latency | `GET /api/content/search/?q=...` | < 1200 ms |
| `query_count` | list endpoints | <= 10 unless justified |
| `proxy_calls` | list endpoints | <= 2 per request unless justified |
| `proxy_time_ms` | any single endpoint | <= 500 ms p95 |

### Frontend

| Metric | Threshold |
|---|---|
| LCP | < 2500 ms |
| INP | < 200 ms |
| CLS | < 0.10 |
| TTFB | < 800 ms |
| FCP | < 1800 ms |

## Update Policy

- If a PR changes one of these request paths materially, update the row
  or explicitly state why the existing measurement still applies.
- If a new critical endpoint or route is introduced, add a row before
  calling the path "production ready".
- If a one-off optimization needs historical comparison, add a dated
  comparison note in the PR or in `history/implementation-history.md`
  rather than renaming table columns after sprint numbers.
