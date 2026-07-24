package clients

import "errors"

// Error sentinels exposed to service layers and handlers. Every code path
// outside this package should classify upstream failures via errors.Is so the
// /search and /homepage aggregators can build consistent per-bucket error
// messages.
var (
	// ErrNotFound — upstream returned 404. Treat as "the resource does not
	// exist" rather than "we couldn't reach the provider".
	ErrNotFound = errors.New("resource not found")

	// ErrTimeout — request or context deadline exceeded.
	ErrTimeout = errors.New("request timed out")

	// ErrConnection — transport-level failure (DNS, TCP, TLS, body read, etc.).
	ErrConnection = errors.New("connection failed")

	// ErrNotJSON — upstream returned a 2xx body that didn't parse as JSON.
	// Not retried (the request is fine, the response shape is wrong).
	ErrNotJSON = errors.New("response was not JSON")

	// ErrRateLimit — upstream signalled 429.
	ErrRateLimit = errors.New("rate limit exceeded")

	// ErrProviderAuth — upstream signalled 401/403, or our OAuth flow failed
	// before we could attach a token. Stops the silent "empty Authorization"
	// degradation that produced non-deterministic 400/401s in earlier sprints.
	ErrProviderAuth = errors.New("provider authentication failed")

	// ErrServerError — upstream signalled 5xx.
	ErrServerError = errors.New("provider server error")

	// ErrClientRequest — upstream signalled a 4xx other than 401/403/404/429.
	// Indicates a malformed request we shouldn't retry. Surfaced separately
	// from ErrServerError so handlers can decide between 502 and 400-style
	// responses if they ever choose to.
	ErrClientRequest = errors.New("upstream rejected request")

	// ErrUpstreamExhausted — wraps the most recent classified failure
	// (typically ErrRateLimit or ErrServerError) when the retry loop ran out
	// of attempts. errors.Is(err, ErrUpstreamExhausted) is the right way to
	// distinguish "we tried and gave up" from a single-shot failure.
	ErrUpstreamExhausted = errors.New("upstream retries exhausted")

	// ErrCircuitOpen — the provider recently exceeded the consecutive
	// transient-failure threshold, so calls fail fast during cooldown.
	ErrCircuitOpen = errors.New("provider circuit is open")
)
