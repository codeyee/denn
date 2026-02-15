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
	}

	if cfg.TmdbApiKey == "" {
		return nil, fmt.Errorf("TMDB_API_KEY is required")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}

	return fallback
}
