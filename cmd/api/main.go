// @title           Denn Proxy API
// @version         1.0
// @description     REST API proxy that aggregates metadata from TMDB, IGDB, Spotify, and OpenLibrary.
// @description     Authentication: send API key via X-Api-Key header or Authorization: Bearer <token>.
// @description     Rate limit: 60 requests/minute on protected endpoints.

// @host            localhost:8080
// @BasePath        /proxy/v1

// @securityDefinitions.apikey  ApiKeyHeader
// @in                          header
// @name                        X-Api-Key
// @description                 API key passed in the X-Api-Key header

// @securityDefinitions.apikey  BearerAuth
// @in                          header
// @name                        Authorization
// @description                 API key passed as a Bearer token: "Authorization: Bearer <key>"

package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/config"
	"github.com/codeyee/denn-proxy/internal/handlers/albums"
	"github.com/codeyee/denn-proxy/internal/handlers/books"
	"github.com/codeyee/denn-proxy/internal/handlers/games"
	"github.com/codeyee/denn-proxy/internal/handlers/health"
	"github.com/codeyee/denn-proxy/internal/handlers/homepage"
	"github.com/codeyee/denn-proxy/internal/handlers/movies"
	"github.com/codeyee/denn-proxy/internal/handlers/multisearch"
	"github.com/codeyee/denn-proxy/internal/handlers/tvshows"
	"github.com/codeyee/denn-proxy/internal/middleware"

	tmdbclient "github.com/codeyee/denn-proxy/internal/providers/tmdb"
	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb/service"

	igdbclient "github.com/codeyee/denn-proxy/internal/providers/igdb"
	olclient "github.com/codeyee/denn-proxy/internal/providers/openlibrary"
	spotifyclient "github.com/codeyee/denn-proxy/internal/providers/spotify"

	booksservice "github.com/codeyee/denn-proxy/internal/services/books/service"
	gamesservice "github.com/codeyee/denn-proxy/internal/services/games/service"
	spotifyservice "github.com/codeyee/denn-proxy/internal/services/spotify/service"
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

	spotifyClient := spotifyclient.NewClient(cfg.SpotifyClientID, cfg.SpotifyClientSecret, cache)
	spotifySvc := spotifyservice.NewService(spotifyClient)

	openLibraryClient := olclient.NewClient(cache)
	booksSvc := booksservice.NewService(openLibraryClient)

	movieHandler := movies.NewHandler(tmdbSvc)
	tvHandler := tvshows.NewHandler(tmdbSvc)
	gamesHandler := games.NewHandler(gamesSvc)
	albumHandler := albums.NewHandler(spotifySvc)
	bookHandler := books.NewHandler(booksSvc)

	multiSearchHandler := multisearch.NewHandler(tmdbSvc, gamesSvc, spotifySvc, booksSvc)
	homepageHandler := homepage.NewHandler(tmdbSvc, gamesSvc, spotifySvc, booksSvc)

	r := gin.Default()

	corsConfig := cors.DefaultConfig()
	if cfg.CorsAllowOrigins == "*" {
		corsConfig.AllowAllOrigins = true
	} else {
		corsConfig.AllowOrigins = strings.Split(cfg.CorsAllowOrigins, ",")
	}
	corsConfig.AllowMethods = []string{"GET", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Length", "Content-Type", "X-User-Country", "X-Api-Key", "Authorization"}
	r.Use(cors.New(corsConfig))

	api := r.Group("/proxy/v1")
	{
		api.GET("/health", health.HealthCheck)

		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(cfg.ApiKey))
		protected.Use(middleware.RateLimitMiddleware(cache, 60))

		protected.GET("/multi-search", multiSearchHandler.Search)
		protected.GET("/homepage", homepageHandler.Homepage)

		movies := protected.Group("/movies")
		{
			movies.GET("/search", movieHandler.Search)
			movies.GET("/bulk", movieHandler.Bulk)
			movies.GET("/trending", movieHandler.Trending)
			movies.GET("/:id", movieHandler.Detail)
		}

		tv := protected.Group("/tv-shows")
		{
			tv.GET("/search", tvHandler.Search)
			tv.GET("/bulk", tvHandler.Bulk)
			tv.GET("/trending", tvHandler.Trending)
			tv.GET("/:id", tvHandler.Detail)
			tv.GET("/:id/seasons/:season_number", tvHandler.SeasonDetail)
		}

		games := protected.Group("/games")
		{
			games.GET("/search", gamesHandler.Search)
			games.GET("/bulk", gamesHandler.Bulk)
			games.GET("/trending", gamesHandler.Trending)
			games.GET("/:id", gamesHandler.Detail)
		}

		albums := protected.Group("/albums")
		{
			albums.GET("/search", albumHandler.Search)
			albums.GET("/bulk", albumHandler.Bulk)
			albums.GET("/trending", albumHandler.Trending)
			albums.GET("/:id", albumHandler.Detail)
		}

		books := protected.Group("/books")
		{
			books.GET("/search", bookHandler.Search)
			books.GET("/bulk", bookHandler.Bulk)
			books.GET("/trending", bookHandler.Trending)
			books.GET("/:id", bookHandler.Detail)
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
		fmt.Printf("\nServer running on port %s\n", cfg.Port)

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
