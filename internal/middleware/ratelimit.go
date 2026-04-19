package middleware

import (
	"fmt"
	"net/http"
	"sync/atomic"
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/handlers/common"
	"github.com/codeyee/denn-proxy/internal/logging"
	"github.com/gin-gonic/gin"
)

// rateLimitDegradedHeader marks responses that bypassed rate limiting
// because the cache (Redis) was unavailable. Operators and downstream
// observability can alert on its presence — previously the middleware
// silently fell open, which made a Redis outage indistinguishable from
// "no traffic was throttled".
const rateLimitDegradedHeader = "X-RateLimit-Degraded"

// degradedLogSampleEvery throttles the fail-open warning so an outage does
// not flood the log at request rate. We log the first occurrence and then
// every Nth event after that.
const degradedLogSampleEvery = 100

// degradedFailures counts cache failures observed by RateLimitMiddleware.
// Module-level so it survives across requests; access via atomic ops.
var degradedFailures uint64

// noOpCacheTypeName is the type name we expect for clients.NoOpCache; we
// detect it at startup so operators get a single warning instead of one
// per request via the fail-open header.
const noOpCacheTypeName = "clients.NoOpCache"

// WarnIfRateLimitCacheNoOp emits a one-shot warning if the cache passed to
// the rate limiter is the no-op implementation. Call this from main after
// wiring the cache.
func WarnIfRateLimitCacheNoOp(cache clients.Cache) {
	if _, ok := cache.(clients.NoOpCache); ok {
		logging.L().Warn("ratelimit_cache_is_noop_throttling_disabled",
			"cache_type", noOpCacheTypeName)
	}
}

func RateLimitMiddleware(cache clients.Cache, limit int) gin.HandlerFunc {
	_, isNoOp := cache.(clients.NoOpCache)
	return func(c *gin.Context) {
		if limit <= 0 {
			c.Next()
			return
		}

		// NoOp cache means rate limiting is structurally off; surface it
		// as a degraded response and skip the Incr round-trip entirely.
		if isNoOp {
			c.Header(rateLimitDegradedHeader, "noop-cache")
			c.Next()
			return
		}

		ip := c.ClientIP()
		key := fmt.Sprintf("ratelimit:%s", ip)

		count, err := cache.Incr(c.Request.Context(), key)
		if err != nil {
			// Fail open: better to serve traffic than to 500 the API on
			// a Redis hiccup, but make the degradation observable so a
			// sustained outage triggers alerts rather than going
			// unnoticed until upstream providers rate-limit us.
			n := atomic.AddUint64(&degradedFailures, 1)
			if n == 1 || n%degradedLogSampleEvery == 0 {
				logging.L().Warn("ratelimit_cache_unavailable_failing_open",
					"failures", n,
					"error", err.Error(),
					"request_id", requestIDOrEmpty(c),
				)
			}
			c.Header(rateLimitDegradedHeader, "cache-error")
			c.Next()
			return
		}

		if count == 1 {
			// Set expiration for the new window
			cache.Expire(c.Request.Context(), key, 1*time.Minute)
		}

		remaining := limit - int(count)
		if remaining < 0 {
			remaining = 0
		}

		c.Header("X-RateLimit-Limit", fmt.Sprintf("%d", limit))
		c.Header("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))

		if count > int64(limit) {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, common.ErrorResponse{
				Error:     common.CodeRateLimit,
				Message:   "Rate limit exceeded",
				RequestID: common.RequestIDFromContext(c),
			})
			return
		}

		c.Next()
	}
}
