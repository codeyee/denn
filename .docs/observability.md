# Observability

This document describes how the three services in the workspace (`web`,
`core`, `proxy`) emit telemetry and how to correlate it during an
incident. It is the consumer-facing companion of:

- `contracts/internal-http.md` (headers + error envelope)
- `adr/0001-external-metadata-integration.md` (topology)

Phase 0 establishes structured logs, one logical request ID per browser
navigation, cache/data-source dimensions, Web Vitals delivery, and
repeatable browser evidence. There is still no repository-owned log
shipping, tracing backend, or metrics scraper; the contract below is
what the deployment log backend must query.

We deliberately do **not** expose an in-process metrics endpoint at
this stage. The reasoning lives in §3 below.

## 1. Correlation: `X-Request-Id`

Every request that crosses a service boundary carries an
`X-Request-Id` header. The rules are uniform across services:

- If the incoming request has a valid bounded `X-Request-Id`, propagate
  it unchanged.
- Otherwise, generate a UUIDv4 at the edge and attach it.
- Echo it back in the response headers.
- Include it in every structured log line emitted while handling that
  request.
- Include it in the error envelope (`request_id` field) on 4xx/5xx
  responses.
- Accept only 1–128 characters matching
  `[A-Za-z0-9][A-Za-z0-9._:-]*`; replace invalid, whitespace-bearing, or
  PII-like values instead of logging them.

Implementation:

- `proxy`: `internal/middleware/requestid.go` (generates / propagates,
  stores on `gin.Context` under `RequestIDContextKey`, exposed via
  `common.RequestIDFromContext`).
- `core`: `core/middleware/request_id.py` (`RequestIdMiddleware` runs
  first; value is exposed both as `request.request_id` and via
  `core.middleware.request_id.get_current_request_id()` for use inside
  log formatters and downstream HTTP clients).
- `web`: [`web/src/server/proxy.ts`](../../web/src/server/proxy.ts)
  memoizes one ID for the incoming SSR request and echoes it on the page
  response. TanStack Query prefetch in
  [`web/src/lib/api/queries/server.ts`](../../web/src/lib/api/queries/server.ts) sets `X-Request-Id` on outbound `core` fetches. The browser BFF [`web/src/routes/api/proxy/$.ts`](../../web/src/routes/api/proxy/$.ts) forwards or generates request IDs for upstream proxy calls.

When debugging, grab the `request_id` from the user-visible error or
the `X-Request-Id` response header and `grep` it across the three
services' logs to reconstruct the full call.

## 2. Log shape

All services emit one JSON object per line on stdout. The minimum
required fields are:

| Field         | Type    | Notes                                          |
| ------------- | ------- | ---------------------------------------------- |
| `ts`          | string  | ISO-8601 / RFC3339 timestamp                   |
| `level`       | string  | `debug` / `info` / `warn` / `error`            |
| `msg`         | string  | Stable event name (see below)                  |
| `request_id`  | string  | Empty for non-request-scoped events            |
| `service`     | string  | `web`, `core`, or `proxy`                      |

Service-specific fields are additive. The current implementations:

### `proxy` (Go, `log/slog` JSON handler)

- Configured in `proxy/internal/logging/logger.go`. `logging.SetDefault()`
  installs the JSON logger as the process-wide `slog.Default()`.
- Access logs are emitted by `internal/middleware/accesslog.go` with
  `msg = "http_request"` and these extra fields:
  `method`, `path` (matched route template), `status`,
  `duration_ms`, `bytes_out`, bounded `consumer` (`web`, `core`,
  `unknown`), optional bounded `cache_status`, and optional
  `ratelimit_degraded`.
- Cache backends emit `msg = "cache_get_failed"` /
  `msg = "cache_set_failed"` from `internal/clients/cached_client.go`
  with fields `api`, `cache_type`, `failures`, `error`.
- Rate-limit cache outages emit `msg = "ratelimit_cache_unavailable"` /
  `msg = "ratelimit_set_failed"` from
  `internal/middleware/ratelimit.go`.

### `core` (Django, custom `JsonFormatter`)

- Configured in `core/core/logging.py` (`build_logging_config`) and
  wired in `core/core/settings/base.py` only when not running tests.
- Access logs are emitted by `core/core/middleware/access_log.py` with
  `msg = "http_request"` and fields `method`, `path`, `status`,
  `duration_ms`, `payload_size_bytes`, and the boolean `authenticated`.
- With `PERF_LOGGING_ENABLED=true`, the same line includes
  `query_count`, `db_time_ms`, `proxy_calls`, `proxy_time_ms`,
  `data_fresh`, `data_stale`, `data_missing`, and `provider_fetches`.
- Outbound calls to `proxy` are logged from
  `content/services/proxy_client.py` as `outbound_http_request` with a
  bounded route template, status, duration, cache status, target service,
  and request ID. Query values and raw provider URLs are not logged.

### `web`

- SSR session resolution emits `msg=session_bootstrap` with resolution
  and duration.
- SSR loaders emit `msg=outbound_http_request` for `core`/`proxy`.
- The BFF emits `msg=http_request` with status, duration, payload size,
  cache status, and `Server-Timing`.
- Web Vitals ingestion emits `msg=web_vital` with a normalized route
  template, bounded cold/warm browser state, and navigation type.
- There is no JSON logger dependency; server code emits one serialized
  JSON object per line.

## 3. Metrics

There is no metrics endpoint and no in-process counter today. All
operational signals are derived from the structured access logs
described in §2.

### Why not a JSON or Prometheus endpoint yet

An earlier iteration of this sprint included an in-memory recorder
exposed at `GET /v1/proxy/_internal/metrics`. We removed it because:

- **Per-replica state is misleading.** In-memory counters are only
  valid for one process. With more than one pod, a scrape returns a
  fraction of the real traffic, and consumers tend to forget that.
- **No scraper, no value.** The endpoint had no consumer. Endpoints
  without consumers rot and confuse new readers about the contract.
- **Restart resets the series.** Any rolling deploy loses the
  history, which makes the data unsuitable for alerts or trends.
- **Same auth as data callers.** Mixing telemetry behind the same
  `X-Api-Key` as the data API blurs the boundary. Real metrics
  should live on a separate listener.
- **It would collide with a real `/metrics`.** The day a Prometheus
  client lands, it will mount `/metrics` in the standard text format;
  having a parallel, custom shape is pure friction.

### How to derive the same signals from logs

Every relevant event already lives in JSON logs:

| Signal              | Source                                                                 |
| ------------------- | ---------------------------------------------------------------------- |
| Request latency     | `msg=http_request` → `path` + `status` + `duration_ms`                 |
| Browser vitals      | `msg=web_vital` → normalized `route`, `browser_state`, metric/value    |
| Session bootstrap   | `msg=session_bootstrap` → `resolution` + `duration_ms`                  |
| Cross-service split | `msg=outbound_http_request` → target + duration + request ID            |
| DB/proxy split      | `core http_request` → DB/proxy timing and count fields                   |
| Local freshness     | `core http_request` → fresh/stale/missing/provider counters              |
| Cache state         | `proxy/web http_request` → `cache_status`                                |
| 4xx/5xx rate        | `msg=http_request` filtered by `status` and `level`                    |
| Cache outage        | `msg=cache_get_failed` / `cache_set_failed` (sampled, with `failures`) |
| Rate-limit degraded | `msg=http_request` with `ratelimit_degraded` field present             |
| Auth failures       | `msg=http_request` with `status=401` on `/v1/proxy/*`                  |

For per-route p50/p95 latency, aggregate `duration_ms` grouped by
`path` (matched route template) in your log backend.

### When we will revisit this

The `clients.CacheRecorder` interface is intentionally still defined
in `proxy/internal/clients/cached_client.go`. When we install
Prometheus (or OpenTelemetry) we will:

1. Add the client library on a dedicated internal listener (e.g.
   `:9090/metrics`), separate from the public API.
2. Provide an implementation of `CacheRecorder` that delegates to the
   real metric, and call `SetRecorder` from `cmd/api/main.go`.
3. Pick histogram buckets based on the latencies we actually observe
   in logs by then, not on guesswork now.

Until that work is scheduled, do not reintroduce a custom JSON
metrics endpoint.

## 4. Minimal dashboard and alerts

The deployment log backend should expose six route panels: login/session
bootstrap, home, search, detail, lists, and profile. Each panel shows
request count, p50/p75/p95, 5xx rate, payload size, and the applicable
cache/data-source split. Web panels additionally show LCP/INP/CLS p75.

Until a real metrics backend exists, alerts are log-based:

1. **5xx rate** - any service emitting a sustained rate of
   `level=error` `http_request` lines (e.g. > 1% of requests over
   5 minutes).
2. **Session failures** - `session_bootstrap` unavailable or anonymous
   spikes, and p95 above the login threshold in `perf/baseline.md`.
3. **Cache outage** - any non-zero count of
   `msg="cache_get_failed"` / `cache_set_failed` from `proxy` over a
   rolling window. The proxy degrades gracefully (serves uncached) but
   the underlying cache needs attention.
4. **Rate-limit degraded mode** - presence of
   `msg="ratelimit_cache_unavailable"` means rate limiting is not
   being enforced; treat as a security-relevant event.
5. **Slow requests/vitals** - compare route p95 and Web Vitals p75 with
   the per-flow thresholds in `perf/baseline.md`.

## 5. Privacy and cardinality

- Never log JWTs, refresh tokens, cookies, proxy/provider credentials,
  request bodies, raw search terms, or provider URLs containing query
  values.
- Do not log user ID or email in request telemetry; use only the boolean
  `authenticated`.
- Normalize dynamic browser routes (`/content/:id`, `/lists/:id`) and
  provider paths before aggregation.
- `request_id`, `consumer`, cache state, browser state, and navigation
  type are bounded before logging.
- Playwright failure artifacts attach a metadata-only network log with
  query values replaced by `<redacted>`.

## 6. Local debugging recipe

```
# 1. Trigger a request from the browser; copy the X-Request-Id
#    response header, e.g. "8f3...c42".
ID=8f3...c42

# 2. Search web, core and proxy logs for that id.
make tail-web
docker compose logs proxy | jq -c "select(.request_id == \"$ID\")"

# 3. Same for core.
docker compose logs core | jq -c "select(.request_id == \"$ID\")"

# 4. Compute per-route p95 latency from the access log (example).
docker compose logs proxy \
  | jq -r 'select(.msg=="http_request") | [.path, .duration_ms] | @tsv' \
  | awk -F'\t' '{a[$1]=a[$1]" "$2} END {for (p in a) print p, a[p]}'
```

## 7. Roadmap

- Ship logs to a backend (Loki / CloudWatch / etc.) with retention.
- Add a real Prometheus `/metrics` endpoint on a dedicated internal
  listener and wire it through the existing `clients.CacheRecorder`
  interface.
- Add OpenTelemetry tracing using `X-Request-Id` as the trace id seed
  so today's correlation continues to work.
