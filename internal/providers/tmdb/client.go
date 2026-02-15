package tmdb

import (
	"encoding/json"
	"sync"
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
)

const (
	baseURL        = "https://api.themoviedb.org/3"
	maxConcurrency = 20
)

var cacheConfig = clients.CacheConfig{
	KeyTemplates: map[string]string{
		"search_movies":          "tmdb:search:movies:{query}:{page}",
		"search_tv":              "tmdb:search:tv:{query}:{page}",

		"details":                "tmdb:details:{id}:{append}",

		"popular_movies":         "tmdb:popular:movies:{page}",
		"popular_tv":             "tmdb:popular:tv:{page}",

		"external_ids":           "tmdb:ext:{id}",
		"external_ids_tv":        "tmdb:ext:tv:{id}",
		"external_ids_season":    "tmdb:ext:season:{id}:{season}",

		"watch_providers":        "tmdb:wp:{id}",
		"watch_providers_tv":     "tmdb:wp:tv:{id}",
		"watch_providers_season": "tmdb:wp:season:{id}:{season}",

		"images":                 "tmdb:img:{id}",
		"images_tv":              "tmdb:img:tv:{id}",
		"images_season":          "tmdb:img:season:{id}:{season}",
	},

	Timeouts: map[string]time.Duration{
		"search_movies":          6 * time.Hour,
		"search_tv":              6 * time.Hour,

		"details":                12 * time.Hour,

		"popular_movies":         12 * time.Hour,
		"popular_tv":             12 * time.Hour,

		"external_ids":           7 * 24 * time.Hour,
		"external_ids_tv":        7 * 24 * time.Hour,
		"external_ids_season":    7 * 24 * time.Hour,

		"watch_providers":        7 * 24 * time.Hour,
		"watch_providers_tv":     7 * 24 * time.Hour,
		"watch_providers_season": 7 * 24 * time.Hour,

		"images":                 7 * 24 * time.Hour,
		"images_tv":              7 * 24 * time.Hour,
		"images_season":          7 * 24 * time.Hour,
	},
}

type BulkResult struct {
	ID         int             `json:"id"`
	Data       json.RawMessage `json:"data,omitempty"`
	StatusCode int             `json:"status_code"`
	Error      json.RawMessage `json:"error,omitempty"`
}

type BulkSeasonResult struct {
	TVShowID     int             `json:"tv_id"`
	SeasonNumber int             `json:"season_number"`
	Data         json.RawMessage `json:"data,omitempty"`
	StatusCode   int             `json:"status_code"`
	Error        json.RawMessage `json:"error,omitempty"`
}

type SeasonRequest struct {
	TVShowID     int `json:"tv_id"`
	SeasonNumber int `json:"season_number"`
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

func fetchBulk(count int, fn func(idx int)) {
	sem := make(chan struct{}, maxConcurrency)
	var wg sync.WaitGroup

	for i := range count {
		wg.Add(1)
		sem <- struct{}{}

		go func(idx int) {
			defer wg.Done()
			defer func() { <-sem }()
			fn(idx)
		}(i)
	}

	wg.Wait()
}
