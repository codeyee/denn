package middleware

import (
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/handlers/common"
)

// AuthMiddleware authenticates requests using a shared API key.
//
// Fails closed: if apiKey is the empty string, the middleware panics at
// construction time. config.LoadConfig already enforces this at startup,
// but we duplicate the guard here so any future caller (tests included)
// cannot accidentally configure an open proxy.
func AuthMiddleware(apiKey string) gin.HandlerFunc {
	if apiKey == "" {
		log.Panic("middleware.AuthMiddleware: API_KEY must not be empty (refusing to run an open proxy)")
	}

	return func(c *gin.Context) {
		key := c.GetHeader("X-Api-Key")
		if key == "" {
			authHeader := c.GetHeader("Authorization")
			if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
				key = strings.TrimPrefix(authHeader, "Bearer ")
			}
		}

		if key == "" || key != apiKey {
			c.AbortWithStatusJSON(http.StatusUnauthorized, common.ErrorResponse{
				Error:     "UNAUTHORIZED",
				Message:   "Unauthorized",
				RequestID: common.RequestIDFromContext(c),
			})
			return
		}

		c.Next()
	}
}
