package tmdb

import (
	"time"

	cachettl "github.com/codeyee/denn-proxy/internal/cache"
	"github.com/codeyee/denn-proxy/internal/clients"
)

const baseURL = "https://api.themoviedb.org/3"

var cacheConfig = clients.CacheConfig{
	KeyTemplates: map[string]string{
		"search_movies":          "tmdb:search:movies:{query}:{page}:{adult}",
		"search_tv":              "tmdb:search:tv:{query}:{page}:{adult}",
		"details":                "tmdb:details:{id}:{append}",
		"images_season":          "tmdb:img:season:{id}:{season}",
		"watch_providers_season": "tmdb:wp:season:{id}:{season}",
		"popular_movies":         "tmdb:popular:movies:{page}",
		"popular_tv":             "tmdb:popular:tv:{page}",
	},

	TTLs: map[string]time.Duration{
		"search_movies":          cachettl.SearchTTL,
		"search_tv":              cachettl.SearchTTL,
		"details":                cachettl.DetailTTL,
		"images_season":          cachettl.MediaTTL,
		"watch_providers_season": cachettl.MediaTTL,
		"popular_movies":         cachettl.CatalogueTTL,
		"popular_tv":             cachettl.CatalogueTTL,
	},
}

type Client struct {
	*clients.CachedClient
}

func NewClient(apiKey string, cache clients.Cache, opts ...clients.ClientOption) *Client {
	baseOpts := []clients.ClientOption{
		clients.WithAPIName("tmdb"),
		clients.WithHeaders(func() map[string]string {
			return map[string]string{
				"Content-Type":  "application/json",
				"Accept":        "application/json",
				"Authorization": "Bearer " + apiKey,
			}
		}),
	}

	baseOpts = append(baseOpts, opts...)
	base := clients.NewBaseClient(baseURL, baseOpts...)
	cached := clients.NewCachedClient(base, cache, cacheConfig)

	return &Client{CachedClient: cached}
}
