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
