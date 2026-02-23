package health

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

type HealthResponse struct {
	Service string `json:"service"`
	Status  string `json:"status"`
	Version string `json:"version"`
}

// HealthCheck godoc
// @Summary      Health check
// @Description  Public endpoint — no authentication required.
// @Tags         Health
// @Produce      json
// @Success      200  {object}  health.HealthResponse
// @Router       /health [get]
func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, HealthResponse{
		Service: "denn-proxy",
		Status:  "pass",
		Version: "1.0.0",
	})
}
