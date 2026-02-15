package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/config"
	"github.com/codeyee/denn-proxy/internal/handlers"

	tmdbclient "github.com/codeyee/denn-proxy/internal/providers/tmdb"
	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb"

	igdbclient "github.com/codeyee/denn-proxy/internal/providers/igdb"
	gamesservice "github.com/codeyee/denn-proxy/internal/services/games"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load config: %v", err)
	}

	var cache clients.Cache

	redisCache, err := clients.NewRedisCache(cfg.RedisURL)
	if err != nil {
		log.Printf("Warning: Redis unavailable (%v), continuing without cache\n", err)
		cache = clients.NoOpCache{}
	} else {
		cache = redisCache
	}
	defer cache.Close()

	tmdbClient := tmdbclient.NewClient(cfg.TmdbApiKey, cache)
	tmdbSvc := tmdbservice.NewService(tmdbClient)

	igdbClient := igdbclient.NewClient(cfg.IgdbClientID, cfg.IgdbClientSecret, cache)
	gamesSvc := gamesservice.NewService(igdbClient)

	movieHandler := handlers.NewMovieHandler(tmdbSvc)
	tvHandler := handlers.NewTVShowHandler(tmdbSvc)
	gamesHandler := handlers.NewGamesHandler(gamesSvc)

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

		games := api.Group("/games")
		{
			games.GET("/search", gamesHandler.Search)
			games.GET("/bulk", gamesHandler.Bulk)
			games.GET("/trending", gamesHandler.Trending)
			games.GET("/:id", gamesHandler.Detail)
		}
	}


	addr := fmt.Sprintf(":%s", cfg.Port)

	srv := &http.Server{
		Addr:    addr,
		Handler: r,
	}

	ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	go func() {
		fmt.Printf("Server running on port %s\n", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server error: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}
