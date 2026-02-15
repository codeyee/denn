package config

import (
	"fmt"
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	Port                string
	TmdbApiKey          string
	IgdbClientID        string
	IgdbClientSecret    string
	SpotifyClientID     string
	SpotifyClientSecret string
	RedisURL            string
	ApiKey              string
	CorsAllowOrigins    string
}

func LoadConfig() (*Config, error) {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on system environment variables")
	}

	cfg := &Config{
		Port:                getEnv("PORT", "8080"),
		TmdbApiKey:          getEnv("TMDB_API_KEY", ""),
		IgdbClientID:        getEnv("IGDB_CLIENT_ID", ""),
		IgdbClientSecret:    getEnv("IGDB_CLIENT_SECRET", ""),
		SpotifyClientID:     getEnv("SPOTIFY_CLIENT_ID", ""),
		SpotifyClientSecret: getEnv("SPOTIFY_CLIENT_SECRET", ""),
		RedisURL:            getEnv("REDIS_URL", "localhost:6379"),
		ApiKey:              getEnv("API_KEY", ""),
		CorsAllowOrigins:    getEnv("CORS_ALLOW_ORIGINS", "*"),
	}

	if cfg.ApiKey == "" {
		return nil, fmt.Errorf("API_KEY is required")
	}

	if cfg.TmdbApiKey == "" {
		return nil, fmt.Errorf("TMDB_API_KEY is required")
	}

	if cfg.IgdbClientID == "" || cfg.IgdbClientSecret == "" {
		return nil, fmt.Errorf("IGDB_CLIENT_ID and IGDB_CLIENT_SECRET are required")
	}

	if cfg.SpotifyClientID == "" || cfg.SpotifyClientSecret == "" {
		return nil, fmt.Errorf("SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET are required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}

	return fallback
}
