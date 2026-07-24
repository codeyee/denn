package middleware

import (
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/logging"
)

// AccessLog emits one structured JSON line per request. Pair it with
// RequestID so log lines can be joined across services via request_id.
//
// Fields: ts (handled by slog), level, msg, request_id, method, path
// (matched route template), status, duration_ms, bytes_out,
// consumer, optional cache_status, optional ratelimit_degraded.
//
// Per-route latency aggregation is deliberately delegated to whatever
// log/metrics backend ingests these lines. We do not maintain an
// in-process counter — see .docs/observability.md.
func AccessLog() gin.HandlerFunc {
	log := logging.L()
	return func(c *gin.Context) {
		start := time.Now()

		c.Next()

		durationMs := time.Since(start).Milliseconds()
		path := c.FullPath()
		if path == "" {
			path = "/unmatched"
		}

		fields := []any{
			"request_id", requestIDOrEmpty(c),
			"method", c.Request.Method,
			"path", path,
			"status", c.Writer.Status(),
			"duration_ms", durationMs,
			"bytes_out", c.Writer.Size(),
			"consumer", boundedConsumer(c.GetHeader("X-Api-Consumer")),
		}

		if cacheStatus := boundedCacheStatus(c.Writer.Header().Get("X-Cache")); cacheStatus != "" {
			fields = append(fields, "cache_status", cacheStatus)
		}

		if degraded := c.Writer.Header().Get("X-RateLimit-Degraded"); degraded != "" {
			fields = append(fields, "ratelimit_degraded", degraded)
		}

		switch {
		case c.Writer.Status() >= 500:
			log.Error("http_request", fields...)
		case c.Writer.Status() >= 400:
			log.Warn("http_request", fields...)
		default:
			log.Info("http_request", fields...)
		}
	}
}

func boundedConsumer(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "web":
		return "web"
	case "core":
		return "core"
	default:
		return "unknown"
	}
}

func boundedCacheStatus(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "HIT":
		return "HIT"
	case "MISS":
		return "MISS"
	case "STALE":
		return "STALE"
	case "BYPASS":
		return "BYPASS"
	default:
		return ""
	}
}

func requestIDOrEmpty(c *gin.Context) string {
	if v, ok := c.Get(RequestIDContextKey); ok {
		if s, ok := v.(string); ok {
			return s
		}
	}
	return ""
}
