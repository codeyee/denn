package main

import (
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/codeyee/denn-proxy/internal/config"
	"github.com/codeyee/denn-proxy/internal/handlers"
)

func main() {
	cfg := config.LoadConfig()

	r := gin.Default()

	api := r.Group("/proxy")
	{
		api.GET("/health", handlers.HealthCheck)
	}

	addr := fmt.Sprintf(":%s", cfg.Port)
	fmt.Printf("Server running on port %s\n", cfg.Port)
	r.Run(addr)
}
