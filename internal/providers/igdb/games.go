package igdb

import (
	"context"
	"crypto/md5"
	"fmt"
	"strconv"
	"strings"

	"github.com/codeyee/denn-proxy/internal/clients"
)

const (
	defaultFields = "id,name,summary,storyline,cover.url,cover.image_id,screenshots.url,screenshots.image_id,artworks.url,artworks.image_id,first_release_date,platforms.name,platforms.platform_logo.image_id,game_type,involved_companies.company.name,involved_companies.developer,genres.name,themes.name,game_modes.name,collections.name,franchises.name,age_ratings.rating,age_ratings.category"
	includedGameTypes = "0,4,8,9" // Main Game, Expansion, Remake, Remaster
)

func hashBody(body string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(body)))
}

func (c *Client) SearchGames(ctx context.Context, query string, limit, offset int) (*clients.Response, error) {
	// Filter by game_type instead of category
	body := fmt.Sprintf(`search "%s"; fields %s; where game_type = (%s); limit %d; offset %d;`, 
		query, defaultFields, includedGameTypes, limit, offset)

	return c.CachedPost(ctx, "games", "api_igdb_search", body, nil, map[string]string{
		"query":     query,
		"limit":     strconv.Itoa(limit),
		"offset":    strconv.Itoa(offset),
		"body_hash": hashBody(body),
	})
}

func (c *Client) GetGame(ctx context.Context, id int) (*clients.Response, error) {
	body := fmt.Sprintf("fields %s; where id = %d;", defaultFields, id)

	return c.CachedPost(ctx, "games", "api_igdb_details", body, nil, map[string]string{
		"game_id":   strconv.Itoa(id),
		"body_hash": hashBody(body),
	})
}

func (c *Client) GetBulkGames(ctx context.Context, ids []int) (*clients.Response, error) {
	if len(ids) == 0 {
		return &clients.Response{Data: []byte("[]"), StatusCode: 200}, nil
	}

	strIDs := make([]string, len(ids))
	for i, id := range ids {
		strIDs[i] = strconv.Itoa(id)
	}
	idsStr := strings.Join(strIDs, ",")

	body := fmt.Sprintf("fields %s; where id = (%s); limit %d;", defaultFields, idsStr, len(ids))
 
	return c.CachedPost(ctx, "games", "api_igdb_bulk", body, nil, map[string]string{
		"ids_hash":  idsStr,
		"body_hash": hashBody(body),
	})
}

func (c *Client) GetPopularGames(ctx context.Context, limit, offset int) (*clients.Response, error) {
	body := fmt.Sprintf("fields %s; where game_type = (%s) & aggregated_rating != null; sort aggregated_rating desc; limit %d; offset %d;",
		defaultFields, includedGameTypes, limit, offset)

	return c.CachedPost(ctx, "games", "api_igdb_popular", body, nil, map[string]string{
		"limit":     strconv.Itoa(limit),
		"offset":    strconv.Itoa(offset),
		"body_hash": hashBody(body),
	})
}

func (c *Client) GetPopularityPrimitives(ctx context.Context, popularityType, limit int) (*clients.Response, error) {
	body := fmt.Sprintf("fields game_id,value,popularity_type; sort value desc; limit %d; where popularity_type = %d;",
		limit, popularityType)

	return c.CachedPost(ctx, "popularity_primitives", "api_igdb_popularity", body, nil, map[string]string{
		"popularity_type": strconv.Itoa(popularityType),
		"limit":           strconv.Itoa(limit),
		"body_hash":       hashBody(body),
	})
}
