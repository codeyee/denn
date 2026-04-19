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
	"sync/atomic"
	"time"

	"github.com/codeyee/denn-proxy/internal/logging"
)

const defaultCacheTTL = time.Hour

// cacheLogSampleEvery throttles how often we log cache Get/Set failures.
// We log the first failure and then every Nth one — this ensures we
// notice an outage immediately without flooding the log when Redis is
// truly down. Per-CachedClient counter so each provider gets its own
// signal in the logs.
const cacheLogSampleEvery = 100

// CacheRecorder is an optional sink for cache events. It is intentionally
// minimal so a future metrics package (Prometheus, OTEL, etc.) can plug in
// without touching the client. Implementations must be safe for
// concurrent use.
type CacheRecorder interface {
	OnHit(api, cacheType string)
	OnMiss(api, cacheType string)
	OnError(api, cacheType, op string, err error)
}

type CacheConfig struct {
	KeyTemplates map[string]string
	TTLs         map[string]time.Duration
}

type CachedClient struct {
	*BaseClient
	cache    Cache
	config   CacheConfig
	recorder CacheRecorder

	getFailures uint64
	setFailures uint64
}

func NewCachedClient(base *BaseClient, cache Cache, config CacheConfig) *CachedClient {
	return &CachedClient{
		BaseClient: base,
		cache:      cache,
		config:     config,
	}
}

// SetRecorder attaches a metrics sink. nil disables recording (default).
func (c *CachedClient) SetRecorder(r CacheRecorder) {
	c.recorder = r
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
	if ttl, ok := c.config.TTLs[cacheType]; ok {
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

	if err != nil {
		// Sampled log + recorder. We deliberately swallow the error so a
		// Redis hiccup doesn't fail the user request, but we make sure
		// the failure is observable.
		c.recordGetFailure(cacheType, err)
	}

	if err == nil && cached != nil {
		var entry cachedEntry

		if json.Unmarshal(cached, &entry) == nil {
			if c.recorder != nil {
				c.recorder.OnHit(c.apiName, cacheType)
			}
			return &Response{Data: entry.Data, StatusCode: entry.StatusCode}, nil
		}
	} else if err == nil && c.recorder != nil {
		c.recorder.OnMiss(c.apiName, cacheType)
	}

	resp, err := c.Request(ctx, method, endpoint, params, body)

	if err != nil {
		return nil, err
	}

	if resp.StatusCode == http.StatusOK {
		entry := cachedEntry{Data: resp.Data, StatusCode: resp.StatusCode}

		if data, marshalErr := json.Marshal(entry); marshalErr == nil {
			if setErr := c.cache.Set(ctx, cacheKey, data, c.getCacheTTL(cacheType)); setErr != nil {
				c.recordSetFailure(cacheType, setErr)
			}
		}
	}

	return resp, nil
}

func (c *CachedClient) recordGetFailure(cacheType string, err error) {
	n := atomic.AddUint64(&c.getFailures, 1)
	if n == 1 || n%cacheLogSampleEvery == 0 {
		logging.L().Warn("cache_get_failed",
			"api", c.apiName,
			"cache_type", cacheType,
			"failures", n,
			"error", err.Error(),
		)
	}
	if c.recorder != nil {
		c.recorder.OnError(c.apiName, cacheType, "get", err)
	}
}

func (c *CachedClient) recordSetFailure(cacheType string, err error) {
	n := atomic.AddUint64(&c.setFailures, 1)
	if n == 1 || n%cacheLogSampleEvery == 0 {
		logging.L().Warn("cache_set_failed",
			"api", c.apiName,
			"cache_type", cacheType,
			"failures", n,
			"error", err.Error(),
		)
	}
	if c.recorder != nil {
		c.recorder.OnError(c.apiName, cacheType, "set", err)
	}
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
