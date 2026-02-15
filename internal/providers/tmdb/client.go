package tmdb

import (
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
)

const baseURL = "https://api.themoviedb.org/3"

var cacheConfig = clients.CacheConfig{
	KeyTemplates: map[string]string{
		"search_movies":          "tmdb:search:movies:{query}:{page}",
		"search_tv":              "tmdb:search:tv:{query}:{page}",
		"details":                "tmdb:details:{id}:{append}",
		"images_season":          "tmdb:img:season:{id}:{season}",
		"watch_providers_season": "tmdb:wp:season:{id}:{season}",
	},

	TTLs: map[string]time.Duration{
		"search_movies":          24 * time.Hour,
		"search_tv":              24 * time.Hour,
		"details":                48 * time.Hour,
		"images_season":          7 * 24 * time.Hour,
		"watch_providers_season": 7 * 24 * time.Hour,
	},
}

type Client struct {
	*clients.CachedClient
}

func NewClient(apiKey string, cache clients.Cache) *Client {
	base := clients.NewBaseClient(baseURL,
		clients.WithAPIName("tmdb"),
		clients.WithHeaders(func() map[string]string {
			return map[string]string{
				"Content-Type":  "application/json",
				"Accept":        "application/json",
				"Authorization": "Bearer " + apiKey,
			}
		}),
	)

	cached := clients.NewCachedClient(base, cache, cacheConfig)

	return &Client{CachedClient: cached}
}
