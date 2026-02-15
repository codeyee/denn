package clients

import (
	"context"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

type Cache interface {
	Get(ctx context.Context, key string) ([]byte, error)
	Set(ctx context.Context, key string, value []byte, ttl time.Duration) error
	DeletePattern(ctx context.Context, pattern string) (int64, error)
	Close() error
}

type RedisCache struct {
	client *redis.Client
}

func NewRedisCache(redisURL string) (*RedisCache, error) {
	opts, err := redis.ParseURL(redisURL)

	if err != nil {
		opts = &redis.Options{Addr: redisURL}
	}

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to connect to Redis at %s: %w", redisURL, err)
	}

	return &RedisCache{client: client}, nil
}

func (r *RedisCache) Get(ctx context.Context, key string) ([]byte, error) {
	data, err := r.client.Get(ctx, key).Bytes()

	if err == redis.Nil {
		return nil, nil
	}

	return data, err
}

func (r *RedisCache) Set(ctx context.Context, key string, value []byte, ttl time.Duration) error {
	return r.client.Set(ctx, key, value, ttl).Err()
}

func (r *RedisCache) DeletePattern(ctx context.Context, pattern string) (int64, error) {
	var cursor uint64
	var deleted int64

	for {
		keys, newCursor, err := r.client.Scan(ctx, cursor, pattern, 100).Result()

		if err != nil {
			return deleted, err
		}

		if len(keys) > 0 {
			n, err := r.client.Del(ctx, keys...).Result()

			if err != nil {
				return deleted, err
			}

			deleted += n
		}

		cursor = newCursor

		if cursor == 0 {
			break
		}
	}

	return deleted, nil
}

func (r *RedisCache) Close() error {
	return r.client.Close()
}

type NoOpCache struct{}

func (NoOpCache) Get(context.Context, string) ([]byte, error) {
	return nil, nil
}

func (NoOpCache) Set(context.Context, string, []byte, time.Duration) error {
	return nil
}

func (NoOpCache) DeletePattern(context.Context, string) (int64, error) {
	return 0, nil
}

func (NoOpCache) Close() error {
	return nil
}
