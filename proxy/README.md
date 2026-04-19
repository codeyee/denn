# Denn Proxy

Go service that fans out to external metadata providers (TMDB, IGDB,
Spotify, OpenLibrary), normalises their responses, and serves them
behind a single, cached, authenticated API.

It is the only service in the workspace that holds upstream API keys.
Both `web` (via its Next.js BFF and SSR helpers) and `core` call this
service over HTTP using the shared `PROXY_API_KEY`.

For the wider topology see
[`docs/adr/0001-external-metadata-integration.md`](../docs/adr/0001-external-metadata-integration.md).
For the cross-service HTTP contract see
[`docs/contracts/internal-http.md`](../docs/contracts/internal-http.md).

---

## Responsibilities

`proxy` owns:

- All credentials for upstream metadata providers.
- Per-provider clients with caching and rate limiting.
- A canonical mapper layer so consumers see Denn-shaped responses, not
  TMDB/IGDB/etc shapes.
- Auth on every public route via the `X-Api-Key` header.
- Structured access logging and a small metrics surface (see below).

`proxy` explicitly does NOT:

- Talk to a database. It is stateless apart from its caches.
- Know anything about Denn users, lists, or sessions.

---

## Tech stack

- Go (toolchain pinned in `go.mod`)
- Gin for HTTP
- `log/slog` for structured logging (JSON handler)
- Redis (optional) for shared caching and rate limiting; falls back to
  in-process LRU when Redis is unavailable
- `swaggo/swag` for the public OpenAPI surface

---

## Layout

```
proxy/
  cmd/api/                 # Entrypoint, wiring, graceful shutdown
  internal/
    clients/               # Cached HTTP client wrappers
    config/                # Env loading + validation
    handlers/              # Gin handlers, grouped per resource
    logging/               # Process-wide slog JSON logger
    metrics/               # In-memory recorder (cache + HTTP latency)
    middleware/            # AuthN, rate limit, request id, access log
    providers/             # Raw clients for TMDB / IGDB / Spotify / OL
    services/              # Provider-specific business logic + mappers
    testutil/              # Shared test helpers
  docs/                    # Design notes, including improvements.md
```

---

## Getting started

```bash
cd proxy
cp .env.example .env  # then fill in real values
make run              # or: go run ./cmd/api
make test             # or: go test ./...
```

The service listens on `:8081` by default.

### Environment variables

The authoritative list lives in `proxy/.env.example`. Highlights:

- `API_KEY` - the shared secret that every caller must present in
  `X-Api-Key`. **Required**; the service refuses to start if empty
  (no open proxy).
- `TMDB_API_KEY`, `IGDB_*`, `SPOTIFY_*`, `OPENLIBRARY_USER_AGENT` -
  upstream provider credentials.
- `REDIS_URL` - optional. When unset the service uses an in-process
  cache and keeps running.
- `RATE_LIMIT_*` - per-key rate limit window and burst.

---

## Observability

- One JSON log line per request, including `request_id`, matched
  route, status, and duration in milliseconds.
- `X-Request-Id` is generated or propagated by
  `internal/middleware/requestid.go` and echoed back to the caller.
- Cache outages are surfaced as `cache_get_failed` /
  `cache_set_failed` log entries (sampled).
- There is no metrics endpoint today. Per-route latency, error rate,
  and cache failures are derived from the access logs. The
  `clients.CacheRecorder` interface is kept in place so a future
  Prometheus integration on a dedicated internal listener can plug in
  without touching handler code.

The full schema, debugging recipes, recommended alerts, and the
rationale for not exposing in-process metrics live in
[`docs/observability.md`](../docs/observability.md).

---

## Error envelope

Every 4xx/5xx response uses the canonical envelope shared with `core`:

```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Too many requests",
  "request_id": "8f3...c42"
}
```

The contract is locked in tests under
`internal/handlers/common/response_test.go`.

---

## Adding a new provider

1. Add a raw client under `internal/providers/<name>/`.
2. Add a service + mapper under `internal/services/<name>/`.
3. Add handlers under `internal/handlers/<name>/`.
4. Wire the handler into the protected group in `cmd/api/main.go` and
   pass the shared `metrics.Recorder` to its `CachedClient`.
5. Document any new env vars in `proxy/.env.example`.
