# Observability

This document describes how the three services in the workspace (`web`,
`core`, `proxy`) emit telemetry and how to correlate it during an
incident. It is the consumer-facing companion of:

- `docs/contracts/internal-http.md` (headers + error envelope)
- `docs/adr/0001-external-metadata-integration.md` (topology)

Goals for this sprint were modest on purpose: structured logs and
request correlation across the three services. There is no log
shipping, tracing backend, or metrics scrape yet; the contract below
is what a future shipper or scraper will key off.

We deliberately do **not** expose an in-process metrics endpoint at
this stage. The reasoning lives in §3 below.

## 1. Correlation: `X-Request-Id`

Every request that crosses a service boundary carries an
`X-Request-Id` header. The rules are uniform across services:

- If the incoming request already has `X-Request-Id`, propagate it
  unchanged.
- Otherwise, generate a UUIDv4 at the edge and attach it.
- Echo it back in the response headers.
- Include it in every structured log line emitted while handling that
  request.
- Include it in the error envelope (`request_id` field) on 4xx/5xx
  responses.

Implementation:

- `proxy`: `internal/middleware/requestid.go` (generates / propagates,
  stores on `gin.Context` under `RequestIDContextKey`, exposed via
  `common.RequestIDFromContext`).
- `core`: `core/middleware/request_id.py` (`RequestIdMiddleware` runs
  first; value is exposed both as `request.request_id` and via
  `core.middleware.request_id.get_current_request_id()` for use inside
  log formatters and downstream HTTP clients).
- `web`: `lib/server/proxy.ts` (`buildProxyHeaders` always sets
  `X-Request-Id`; TanStack Query server prefetch helpers in
  `lib/api/queries/server.ts` propagate the incoming Next.js request id
  when available).

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
  `method`, `path` (matched route template), `raw_path`, `status`,
  `duration_ms`, `bytes_out`, `client_ip`, optional `cache_status`,
  optional `ratelimit_degraded`.
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
  `duration_ms`, `user_id` (or `null`).
- Outbound calls to `proxy` are logged from
  `content/services/proxy_client.py` with structured `extra` fields
  including `endpoint`, `status_code`, and `request_id`.

### `web`

- Server-side `console.warn` / `console.error` calls in BFF and SSR
  helpers use a small JSON payload (`{ event, request_id, ... }`).
- There is no JSON logger installed yet; the contract is simply "do
  not emit unstructured strings from server code", which is enforced
  by code review for now.

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

## 4. Minimal alerts

Until a real metrics backend exists, the recommended alerts are
log-based and intentionally short:

1. **5xx rate** - any service emitting a sustained rate of
   `level=error` `http_request` lines (e.g. > 1% of requests over
   5 minutes).
2. **Auth failures on `proxy`** - bursts of `status=401` on
   `/v1/proxy/*` indicate either a misconfigured caller or an attack;
   correlate by `client_ip`.
3. **Cache outage** - any non-zero count of
   `msg="cache_get_failed"` / `cache_set_failed` from `proxy` over a
   rolling window. The proxy degrades gracefully (serves uncached) but
   the underlying cache needs attention.
4. **Rate-limit degraded mode** - presence of
   `msg="ratelimit_cache_unavailable"` means rate limiting is not
   being enforced; treat as a security-relevant event.
5. **Slow requests** - p95 of `duration_ms` from `http_request` lines
   above an agreed threshold per route. Aggregate by the `path` field
   so cardinality stays bounded to gin route templates.

## 5. Local debugging recipe

```
# 1. Trigger a request from the browser; copy the X-Request-Id
#    response header, e.g. "8f3...c42".
ID=8f3...c42

# 2. Search the proxy logs for that id (jq because logs are JSON).
docker compose logs proxy | jq -c "select(.request_id == \"$ID\")"

# 3. Same for core.
docker compose logs core | jq -c "select(.request_id == \"$ID\")"

# 4. Compute per-route p95 latency from the access log (example).
docker compose logs proxy \
  | jq -r 'select(.msg=="http_request") | [.path, .duration_ms] | @tsv' \
  | awk -F'\t' '{a[$1]=a[$1]" "$2} END {for (p in a) print p, a[p]}'
```

## 6. Roadmap (not in this sprint)

- Ship logs to a backend (Loki / CloudWatch / etc.) with retention.
- Add a real Prometheus `/metrics` endpoint on a dedicated internal
  listener and wire it through the existing `clients.CacheRecorder`
  interface.
- Add OpenTelemetry tracing using `X-Request-Id` as the trace id seed
  so today's correlation continues to work.
