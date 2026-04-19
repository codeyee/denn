package testutil

import (
	"context"
	"sync"
	"time"
)

// MemoryCache is an in-memory, TTL-less implementation of clients.Cache
// suitable for tests that want to observe cache hits without standing up
// Redis. It is goroutine-safe.
type MemoryCache struct {
	mu      sync.Mutex
	data    map[string][]byte
	counts  map[string]int64
	expires map[string]time.Time
}

// NewMemoryCache returns a fresh, empty MemoryCache.
func NewMemoryCache() *MemoryCache {
	return &MemoryCache{
		data:    make(map[string][]byte),
		counts:  make(map[string]int64),
		expires: make(map[string]time.Time),
	}
}

func (c *MemoryCache) Get(_ context.Context, key string) ([]byte, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if exp, ok := c.expires[key]; ok && time.Now().After(exp) {
		delete(c.data, key)
		delete(c.expires, key)
		return nil, nil
	}
	v, ok := c.data[key]
	if !ok {
		return nil, nil
	}
	return v, nil
}

func (c *MemoryCache) Set(_ context.Context, key string, value []byte, ttl time.Duration) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.data[key] = value
	if ttl > 0 {
		c.expires[key] = time.Now().Add(ttl)
	}
	return nil
}

func (c *MemoryCache) TTL(_ context.Context, key string) (time.Duration, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if exp, ok := c.expires[key]; ok {
		return time.Until(exp), nil
	}
	return 0, nil
}

func (c *MemoryCache) DeletePattern(_ context.Context, _ string) (int64, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	n := int64(len(c.data))
	c.data = make(map[string][]byte)
	c.expires = make(map[string]time.Time)
	return n, nil
}

func (c *MemoryCache) Incr(_ context.Context, key string) (int64, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.counts[key]++
	return c.counts[key], nil
}

func (c *MemoryCache) Expire(_ context.Context, key string, ttl time.Duration) (bool, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if _, ok := c.data[key]; !ok {
		if _, hasCount := c.counts[key]; !hasCount {
			return false, nil
		}
	}
	c.expires[key] = time.Now().Add(ttl)
	return true, nil
}

func (c *MemoryCache) Close() error { return nil }
