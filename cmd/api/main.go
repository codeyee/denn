package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/config"
	"github.com/codeyee/denn-proxy/internal/handlers"

	tmdbclient "github.com/codeyee/denn-proxy/internal/providers/tmdb"
	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb"
)

func main() {
	cfg := config.LoadConfig()

	cache, err := clients.NewRedisCache(cfg.RedisURL)
	if err != nil {
		log.Printf("Warning: Redis unavailable (%v), continuing without cache\n", err)
	}

	tmdbClient := tmdbclient.NewClient(cfg.TmdbApiKey, cache)
	tmdbSvc := tmdbservice.NewService(tmdbClient)

	movieHandler := handlers.NewMovieHandler(tmdbSvc)
	tvHandler := handlers.NewTVShowHandler(tmdbSvc)

	r := gin.Default()

	api := r.Group("/proxy")
	{
		api.GET("/health", handlers.HealthCheck)

		movies := api.Group("/movies")
		{
			movies.GET("/search", movieHandler.Search)
			movies.GET("/bulk", movieHandler.Bulk)
			movies.GET("/:id", movieHandler.Detail)
		}

		tv := api.Group("/tv_shows")
		{
			tv.GET("/search", tvHandler.Search)
			tv.GET("/bulk", tvHandler.Bulk)
			tv.GET("/:id", tvHandler.Detail)
			tv.GET("/:id/seasons/:season_number", tvHandler.SeasonDetail)
		}
	}

	addr := fmt.Sprintf(":%s", cfg.Port)
	fmt.Printf("Server running on port %s\n", cfg.Port)
	r.Run(addr)
}