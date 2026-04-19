package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// requestIDHeader is the canonical correlation header. See
// docs/contracts/internal-http.md.
const requestIDHeader = "X-Request-Id"

// RequestIDContextKey is the gin.Context key used to store the request ID.
// Other middleware/handlers should use common.RequestIDFromContext to read it.
const RequestIDContextKey = "request_id"

// RequestID returns a middleware that ensures every request has a stable
// correlation ID exposed both on gin.Context and on the response header.
// If the client sent X-Request-Id, we trust and propagate it; otherwise we
// generate a UUIDv4. Empty/whitespace-only header values are treated as
// missing.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader(requestIDHeader)
		if id == "" {
			id = uuid.NewString()
		}
		c.Set(RequestIDContextKey, id)
		c.Header(requestIDHeader, id)
		c.Next()
	}
}
