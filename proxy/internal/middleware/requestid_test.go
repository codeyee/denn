package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func newRouter() *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(RequestID())
	r.GET("/x", func(c *gin.Context) {
		v, _ := c.Get(RequestIDContextKey)
		c.JSON(http.StatusOK, gin.H{"id": v})
	})
	return r
}

func TestRequestID_GeneratesWhenAbsent(t *testing.T) {
	r := newRouter()
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	r.ServeHTTP(w, req)

	if got := w.Header().Get("X-Request-Id"); got == "" {
		t.Fatalf("expected generated X-Request-Id header, got empty")
	}
}

func TestRequestID_PreservesIncoming(t *testing.T) {
	r := newRouter()
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("X-Request-Id", "client-supplied-id")
	r.ServeHTTP(w, req)

	if got := w.Header().Get("X-Request-Id"); got != "client-supplied-id" {
		t.Fatalf("expected echoed X-Request-Id, got %q", got)
	}
}

func TestRequestID_ReplacesInvalidOrUnboundedIncoming(t *testing.T) {
	r := newRouter()
	w := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/x", nil)
	req.Header.Set("X-Request-Id", "user@example.com contains spaces")
	r.ServeHTTP(w, req)

	got := w.Header().Get("X-Request-Id")
	if got == "" || got == "user@example.com contains spaces" {
		t.Fatalf("expected bounded generated request id, got %q", got)
	}
}
