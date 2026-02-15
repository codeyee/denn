package openlibrary

import (
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
)

const (
	BaseURL      = "https://openlibrary.org"
	CoversURL    = "https://covers.openlibrary.org"
)

type Client struct {
	*clients.CachedClient
}

func NewClient(cache clients.Cache, opts ...clients.ClientOption) *Client {
	baseClient := clients.NewBaseClient(BaseURL,
		append([]clients.ClientOption{
			clients.WithAPIName("openlibrary"),
			clients.WithHeaders(func() map[string]string {
				return map[string]string{
					"Accept": "application/json",
				}
			}),
		}, opts...)...,
	)

	cacheConfig := clients.CacheConfig{
		KeyTemplates: map[string]string{
			"ol_search":   "openlibrary:search:{query}:{page}:{limit}",
			"ol_details":  "openlibrary:details:{book_id}",
			"ol_trending": "openlibrary:trending:{limit}",
		},
		TTLs: map[string]time.Duration{
			"ol_search":   6 * time.Hour,
			"ol_details":  12 * time.Hour,
			"ol_trending": 24 * time.Hour,
		},
	}

	return &Client{
		CachedClient: clients.NewCachedClient(baseClient, cache, cacheConfig),
	}
}
