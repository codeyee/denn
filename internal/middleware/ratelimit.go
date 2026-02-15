package middleware

import (
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/codeyee/denn-proxy/internal/clients"
)

func RateLimitMiddleware(cache clients.Cache, limit int) gin.HandlerFunc {
	return func(c *gin.Context) {
		if limit <= 0 {
			c.Next()
			return
		}

		ip := c.ClientIP()
		key := fmt.Sprintf("ratelimit:%s", ip)

		count, err := cache.Incr(c.Request.Context(), key)
		if err != nil {
			// Fail open if cache is unavailable
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
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{
				"error": "Rate limit exceeded",
			})
			return
		}

		c.Next()
	}
}
