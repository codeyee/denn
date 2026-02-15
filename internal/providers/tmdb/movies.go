package tmdb

import (
	"context"
	"fmt"
	"net/url"
	"strconv"

	"github.com/codeyee/denn-proxy/internal/clients"
)

func (c *Client) SearchMovies(ctx context.Context, query string, page int) (*clients.Response, error) {
	params := url.Values{
		"query": {query},
		"page":  {strconv.Itoa(page)},
	}

	return c.CachedGet(ctx, "search/movie", "search_movies", params, map[string]string{
		"query": query,
		"page":  strconv.Itoa(page),
	})
}

func (c *Client) GetMovieDetails(ctx context.Context, movieID int, appendToResponse string) (*clients.Response, error) {
	endpoint := fmt.Sprintf("movie/%d", movieID)
	params := url.Values{}

	if appendToResponse != "" {
		params.Set("append_to_response", appendToResponse)
	}

	return c.CachedGet(ctx, endpoint, "details", params, map[string]string{
		"id":     strconv.Itoa(movieID),
		"append": appendToResponse,
	})
}

func (c *Client) GetBulkMovies(ctx context.Context, movieIDs []int) []BulkResult {
	results := make([]BulkResult, len(movieIDs))

	fetchBulk(len(movieIDs), func(idx int) {
		movieID := movieIDs[idx]

		resp, err := c.GetMovieDetails(ctx, movieID, "")
		if err != nil {
			results[idx] = BulkResult{ID: movieID, StatusCode: 500}
			return
		}

		if resp.StatusCode == 200 {
			results[idx] = BulkResult{ID: movieID, Data: resp.Data, StatusCode: 200}
		} else {
			results[idx] = BulkResult{ID: movieID, Error: resp.Data, StatusCode: resp.StatusCode}
		}
	})

	return results
}

func (c *Client) GetPopularMovies(ctx context.Context, page int) (*clients.Response, error) {
	params := url.Values{"page": {strconv.Itoa(page)}}

	return c.CachedGet(ctx, "movie/popular", "popular_movies", params, map[string]string{
		"page": strconv.Itoa(page),
	})
}

func (c *Client) GetMovieExternalIDs(ctx context.Context, movieID int) (*clients.Response, error) {
	endpoint := fmt.Sprintf("movie/%d/external_ids", movieID)

	return c.CachedGet(ctx, endpoint, "external_ids", nil, map[string]string{
		"id": strconv.Itoa(movieID),
	})
}

func (c *Client) GetMovieWatchProviders(ctx context.Context, movieID int) (*clients.Response, error) {
	endpoint := fmt.Sprintf("movie/%d/watch/providers", movieID)

	return c.CachedGet(ctx, endpoint, "watch_providers", nil, map[string]string{
		"id": strconv.Itoa(movieID),
	})
}

func (c *Client) GetMovieImages(ctx context.Context, movieID int) (*clients.Response, error) {
	endpoint := fmt.Sprintf("movie/%d/images", movieID)

	return c.CachedGet(ctx, endpoint, "images", nil, map[string]string{
		"id": strconv.Itoa(movieID),
	})
}