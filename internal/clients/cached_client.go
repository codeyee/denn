package clients

import (
	"context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
)

const defaultCacheTTL = time.Hour

type CacheConfig struct {
	KeyTemplates map[string]string
	Timeouts     map[string]time.Duration
}

type CachedClient struct {
	*BaseClient
	cache  Cache
	config CacheConfig
}

func NewCachedClient(base *BaseClient, cache Cache, config CacheConfig) *CachedClient {
	return &CachedClient{
		BaseClient: base,
		cache:      cache,
		config:     config,
	}
}

type cachedEntry struct {
	Data       json.RawMessage `json:"data"`
	StatusCode int             `json:"status_code"`
}

func (c *CachedClient) generateCacheKey(cacheType string, args map[string]string) string {
	if tmpl, ok := c.config.KeyTemplates[cacheType]; ok {
		key := tmpl

		for k, v := range args {
			key = strings.ReplaceAll(key, "{"+k+"}", v)
		}

		return "api:" + key
	}

	sortedKeys := make([]string, 0, len(args))

	for k := range args {
		sortedKeys = append(sortedKeys, k)
	}

	sort.Strings(sortedKeys)
	pairs := make([]string, 0, len(args))

	for _, k := range sortedKeys {
		pairs = append(pairs, k+":"+args[k])
	}

	raw := fmt.Sprintf("%s:%s:%s", c.apiName, cacheType, strings.Join(pairs, ","))
	hash := md5.Sum([]byte(raw))

	return fmt.Sprintf("api:%x", hash)
}

func (c *CachedClient) getCacheTTL(cacheType string) time.Duration {
	if ttl, ok := c.config.Timeouts[cacheType]; ok {
		return ttl
	}

	return defaultCacheTTL
}

func (c *CachedClient) CachedRequest(
	ctx context.Context,
	method, endpoint, cacheType string,
	params url.Values,
	body any,
	cacheArgs map[string]string,
) (*Response, error) {
	cacheKey := c.generateCacheKey(cacheType, cacheArgs)
	cached, err := c.cache.Get(ctx, cacheKey)

	if err == nil && cached != nil {
		var entry cachedEntry

		if json.Unmarshal(cached, &entry) == nil {
			return &Response{Data: entry.Data, StatusCode: entry.StatusCode}, nil
		}
	}

	resp, err := c.Request(ctx, method, endpoint, params, body)

	if err != nil {
		return nil, err
	}

	if resp.StatusCode == http.StatusOK {
		entry := cachedEntry{Data: resp.Data, StatusCode: resp.StatusCode}

		if data, marshalErr := json.Marshal(entry); marshalErr == nil {
			_ = c.cache.Set(ctx, cacheKey, data, c.getCacheTTL(cacheType))
		}
	}

	return resp, nil
}

func (c *CachedClient) CachedGet(
	ctx context.Context,
	endpoint, cacheType string,
	params url.Values,
	cacheArgs map[string]string,
) (*Response, error) {
	return c.CachedRequest(ctx, http.MethodGet, endpoint, cacheType, params, nil, cacheArgs)
}

func (c *CachedClient) CachedPost(
	ctx context.Context,
	endpoint, cacheType string,
	body any,
	params url.Values,
	cacheArgs map[string]string,
) (*Response, error) {
	return c.CachedRequest(ctx, http.MethodPost, endpoint, cacheType, params, body, cacheArgs)
}

func (c *CachedClient) InvalidateCache(ctx context.Context, pattern string) (int64, error) {
	return c.cache.DeletePattern(ctx, pattern)
}

func (c *CachedClient) ClearAllCache(ctx context.Context) (int64, error) {
	pattern := fmt.Sprintf("api:%s:*", c.apiName)
	return c.cache.DeletePattern(ctx, pattern)
}