package handlers

import (
	"net/http"
	"github.com/gin-gonic/gin"
)

type HealthResponse struct {
	Service     string    `json:"service"`
	Status      string    `json:"status"`
	Version     string    `json:"version"`
}

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, HealthResponse{
		Service: "denn-proxy",
		Status: "pass",
		Version: "1.0.0",
	})
}
