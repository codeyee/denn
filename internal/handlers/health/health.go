package health

import (
	"context"
	"net/http"
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/gin-gonic/gin"
)

// CacheStatus is the cache subsection of HealthResponse. Mode is
// "redis" or "noop"; Reachable is meaningful only for "redis" — it carries
// the result of a short ping. Error contains the ping failure when
// Reachable is false.
type CacheStatus struct {
	Mode      string `json:"mode"`
	Reachable bool   `json:"reachable"`
	Error     string `json:"error,omitempty"`
}

type HealthResponse struct {
	Service string      `json:"service"`
	Status  string      `json:"status"`
	Version string      `json:"version"`
	Cache   CacheStatus `json:"cache"`
}

// Handler binds /health to a cache instance so the endpoint can report
// real backend reachability instead of a static "pass". Keeping it as a
// receiver (not a free function) avoids a package-level singleton.
type Handler struct {
	cache clients.Cache
}

func NewHandler(cache clients.Cache) *Handler {
	return &Handler{cache: cache}
}

// HealthCheck godoc
// @Summary      Health check
// @Description  Public endpoint — no authentication required. Reports cache mode and Redis ping result so operators can detect a degraded fail-open state from outside.
// @Tags         Health
// @Produce      json
// @Success      200  {object}  health.HealthResponse
// @Router       /health [get]
func (h *Handler) HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, HealthResponse{
		Service: "denn-proxy",
		Status:  "pass",
		Version: "1.0.0",
		Cache:   probeCache(c.Request.Context(), h.cache),
	})
}

// HealthCheck remains as a package-level convenience for callers that
// don't want to wire the cache (e.g. very old startup paths). It reports
// "noop" so monitoring still sees the degraded state explicitly.
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, HealthResponse{
		Service: "denn-proxy",
		Status:  "pass",
		Version: "1.0.0",
		Cache:   CacheStatus{Mode: "noop", Reachable: false},
	})
}

func probeCache(ctx context.Context, cache clients.Cache) CacheStatus {
	if cache == nil {
		return CacheStatus{Mode: "noop", Reachable: false}
	}
	if _, ok := cache.(clients.NoOpCache); ok {
		return CacheStatus{Mode: "noop", Reachable: false}
	}

	status := CacheStatus{Mode: "redis"}
	if pinger, ok := cache.(clients.Pinger); ok {
		// Cap the ping so a hung Redis cannot hold /health open for the
		// liveness probe budget.
		pctx, cancel := context.WithTimeout(ctx, 1*time.Second)
		defer cancel()
		if err := pinger.Ping(pctx); err != nil {
			status.Reachable = false
			status.Error = err.Error()
			return status
		}
	}
	status.Reachable = true
	return status
}
