package spotify

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/codeyee/denn-proxy/internal/clients"
)

func (c *Client) SearchAlbums(ctx context.Context, query string, limit, offset int) (*clients.Response, error) {
	params := url.Values{
		"q":      {query},
		"type":   {"album"},
		"limit":  {strconv.Itoa(limit)},
		"offset": {strconv.Itoa(offset)},
	}

	return c.CachedGet(ctx, "search", "spotify_search", params, map[string]string{
		"query":  query,
		"limit":  strconv.Itoa(limit),
		"offset": strconv.Itoa(offset),
	})
}

func (c *Client) GetAlbum(ctx context.Context, albumID string) (*clients.Response, error) {
	endpoint := fmt.Sprintf("albums/%s", albumID)

	return c.CachedGet(ctx, endpoint, "spotify_details", nil, map[string]string{
		"album_id": albumID,
	})
}

// GetTrendingAlbums fetches current trending albums from Spotify's public Charts API.
// The /browse/new-releases endpoint is deprecated, so we scrape the charts instead.
func (c *Client) GetTrendingAlbums(ctx context.Context, limit, offset int) (*clients.Response, error) {
	albums, err := c.getChartAlbums(ctx)
	if err != nil {
		return nil, fmt.Errorf("fetch chart albums: %w", err)
	}

	total := len(albums)

	end := offset + limit

	if offset >= total {
		albums = []chartAlbum{}
	} else {
		if end > total {
			end = total
		}

		albums = albums[offset:end]
	}

	payload := chartAlbumsResponse{
		Albums: chartAlbumsPage{
			Items:  albums,
			Total:  total,
			Limit:  limit,
			Offset: offset,
		},
	}

	data, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("marshal chart albums: %w", err)
	}

	return &clients.Response{Data: data, StatusCode: http.StatusOK}, nil
}

func (c *Client) getChartAlbums(ctx context.Context) ([]chartAlbum, error) {
	cached, err := c.cache.Get(ctx, ChartsKey)
	if err == nil && cached != nil {
		var albums []chartAlbum
		if json.Unmarshal(cached, &albums) == nil {
			return albums, nil
		}
	}

	albums, err := c.fetchAndParseCharts(ctx)
	if err != nil {
		return nil, err
	}

	if data, marshalErr := json.Marshal(albums); marshalErr == nil {
		_ = c.cache.Set(ctx, ChartsKey, data, ChartsTTL)
	}

	return albums, nil
}

// fetchAndParseCharts now goes through the shared BaseClient so transient
// 5xx/429 from the public Charts host get retried with jitter and proper
// classification, just like the rest of our upstream calls.
func (c *Client) fetchAndParseCharts(ctx context.Context) ([]chartAlbum, error) {
	resp, err := c.chartsClient.Get(ctx, chartsPath, nil)
	if err != nil {
		return nil, fmt.Errorf("charts request: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("charts API error (status %d)", resp.StatusCode)
	}

	var chartsData chartsResponse
	if err := json.Unmarshal(resp.Data, &chartsData); err != nil {
		return nil, fmt.Errorf("decode charts response: %w", err)
	}

	return parseChartAlbums(chartsData), nil
}

func parseChartAlbums(data chartsResponse) []chartAlbum {
	if len(data.ChartEntryViewResponses) < 2 {
		log.Printf("Warning: charts response has fewer than 2 chart entries")
		return nil
	}

	entries := data.ChartEntryViewResponses[1].Entries
	albums := make([]chartAlbum, 0, len(entries))

	for _, entry := range entries {
		meta := entry.AlbumMetadata
		if meta.AlbumURI == "" {
			continue
		}

		parts := strings.Split(meta.AlbumURI, ":")
		albumID := parts[len(parts)-1]
		if albumID == "" {
			continue
		}

		album := chartAlbum{
			ID:          albumID,
			Name:        meta.AlbumName,
			AlbumType:   "album",
			ReleaseDate: meta.ReleaseDate,
			ExternalURLs: chartExternalURLs{
				Spotify: fmt.Sprintf("https://open.spotify.com/album/%s", albumID),
			},
		}

		if meta.DisplayImageURI != "" {
			album.Images = []chartImage{
				{URL: meta.DisplayImageURI, Height: 640, Width: 640},
				{URL: meta.DisplayImageURI, Height: 300, Width: 300},
				{URL: meta.DisplayImageURI, Height: 64, Width: 64},
			}
		}

		for _, artist := range meta.Artists {
			if artist.Name == "" {
				continue
			}
			album.Artists = append(album.Artists, chartArtist{
				Name: artist.Name,
			})
		}

		albums = append(albums, album)
	}

	return albums
}

// --- Chart response types ---

type chartsResponse struct {
	ChartEntryViewResponses []chartEntryView `json:"chartEntryViewResponses"`
}

type chartEntryView struct {
	Entries []chartEntry `json:"entries"`
}

type chartEntry struct {
	AlbumMetadata chartAlbumMetadata `json:"albumMetadata"`
}

type chartAlbumMetadata struct {
	AlbumURI        string        `json:"albumUri"`
	AlbumName       string        `json:"albumName"`
	DisplayImageURI string        `json:"displayImageUri"`
	ReleaseDate     string        `json:"releaseDate"`
	Artists         []chartRawArtist `json:"artists"`
}

type chartRawArtist struct {
	Name       string `json:"name"`
	SpotifyURI string `json:"spotifyUri"`
}

// --- Normalized chart album types (cached & returned to service) ---

type chartAlbumsResponse struct {
	Albums chartAlbumsPage `json:"albums"`
}

type chartAlbumsPage struct {
	Items  []chartAlbum `json:"items"`
	Total  int          `json:"total"`
	Limit  int          `json:"limit"`
	Offset int          `json:"offset"`
}

type chartAlbum struct {
	ID           string            `json:"id"`
	Name         string            `json:"name"`
	AlbumType    string            `json:"album_type"`
	TotalTracks  int               `json:"total_tracks"`
	ReleaseDate  string            `json:"release_date"`
	Images       []chartImage      `json:"images"`
	Artists      []chartArtist     `json:"artists"`
	ExternalURLs chartExternalURLs `json:"external_urls"`
}

type chartImage struct {
	URL    string `json:"url"`
	Height int    `json:"height"`
	Width  int    `json:"width"`
}

type chartArtist struct {
	Name string `json:"name"`
}

type chartExternalURLs struct {
	Spotify string `json:"spotify"`
}
