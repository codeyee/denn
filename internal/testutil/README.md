# testutil

Shared helpers for proxy tests.

## What lives here

- `RoundTripFunc` — adapter that turns a function into an `http.RoundTripper`.
- `MultiHost(handlers...)` — dispatches requests by URL host, with an optional
  catch-all (`Host: ""`). Misrouted requests fail loudly with HTTP 502.
- `JSONResponse(status, body)` — builds a JSON `*http.Response` from raw bytes,
  a string, or any value `json.Marshal` can encode.
- `StaticJSON(status, body)` — convenience `RoundTripFunc` returning the same
  payload for every request, useful as half of a `MultiHost` setup.
- `HTTPClient(rt)` — tiny `*http.Client` constructor with a 5s timeout to keep
  bugs in fixtures from stalling test runs.
- `MemoryCache` — in-memory implementation of `clients.Cache`. Use this in
  tests that need to assert cache hits/misses; for tests that just need a
  zero-behavior cache, prefer `clients.NoOpCache{}`.

## Conventions

1. Tests outside `internal/testutil` should not redefine `RoundTripFunc`,
   `MockRoundTripper`, or `NoOpCache`. If you find yourself reaching for one
   of those, import it from here (or use `clients.NoOpCache{}`).
2. When a test deliberately exercises an error response (5xx, 429, transport
   failure), pass `clients.WithNoRetry()` (or a small custom `RetryConfig`)
   when constructing the upstream client. The default policy retries 5 times
   with exponential backoff, which can blow a test budget by 30+ seconds.

## Integration tests

Tests that need to talk to a real upstream provider or a real Redis instance
must be guarded with the `integration` build tag:

```go
//go:build integration

package whatever

func TestRealSpotifyAuth(t *testing.T) { ... }
```

Run them explicitly with:

```bash
make test-integration
```

The default `make test` (and CI) skip these files. There are no integration
tests checked in today; this convention exists so future additions are
explicit instead of accidentally slowing down the unit suite.
