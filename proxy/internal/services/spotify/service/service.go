package service

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/models"
	spotifyclient "github.com/codeyee/denn-proxy/internal/providers/spotify"
	servicecommon "github.com/codeyee/denn-proxy/internal/services/common"
	"github.com/codeyee/denn-proxy/internal/services/spotify"
	"github.com/codeyee/denn-proxy/internal/services/spotify/mapper"
)

type SearchResult struct {
	Page         int                 `json:"page"`
	TotalPages   int                 `json:"total_pages"`
	TotalResults int                 `json:"total_results"`
	Results      []models.SearchItem `json:"results"`
}

type BulkAlbumResult struct {
	ID    string        `json:"id"`
	Album *models.Album `json:"data,omitempty"`
	Error string        `json:"error,omitempty"`
}

type Service struct {
	client *spotifyclient.Client
}

func NewService(client *spotifyclient.Client) *Service {
	return &Service{client: client}
}

func unmarshalResponse[T any](resp *clients.Response, err error) (T, error) {
	var zero T

	if err != nil {
		return zero, err
	}

	if cerr := servicecommon.ClassifyStatus("Spotify", resp.StatusCode); cerr != nil {
		return zero, cerr
	}

	var result T
	if err := json.Unmarshal(resp.Data, &result); err != nil {
		return zero, fmt.Errorf("failed to unmarshal Spotify response: %w", err)
	}

	return result, nil
}

func (s *Service) SearchAlbums(ctx context.Context, query string, page, limit int) (SearchResult, error) {
	const spotifySearchMaxLimit = 10
	if limit > spotifySearchMaxLimit {
		limit = spotifySearchMaxLimit
	}

	offset := (page - 1) * limit

	data, err := unmarshalResponse[spotify.SpotifySearchResponse](s.client.SearchAlbums(ctx, query, limit, offset))
	if err != nil {
		if errors.Is(err, clients.ErrProviderAuth) {
			s.client.ClearToken()
		}
		return SearchResult{}, fmt.Errorf("search albums: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Albums.Items))
	for _, album := range data.Albums.Items {
		albumType := strings.ToLower(album.AlbumType)
		if albumType == "single" {
			continue
		}
		items = append(items, mapper.MapSearchItem(album))
	}
	items = servicecommon.FilterEligibleSearchItems(items, time.Now())

	totalPages := 0
	if data.Albums.Total > 0 && limit > 0 {
		totalPages = (data.Albums.Total + limit - 1) / limit
	}

	return SearchResult{
		Page:         page,
		TotalPages:   totalPages,
		TotalResults: data.Albums.Total,
		Results:      items,
	}, nil
}

func (s *Service) GetAlbumComplete(ctx context.Context, albumID string) (models.Album, error) {
	data, err := unmarshalResponse[spotify.SpotifyAlbum](s.client.GetAlbum(ctx, albumID))
	if err != nil {
		if errors.Is(err, clients.ErrProviderAuth) {
			s.client.ClearToken()
		}
		return models.Album{}, fmt.Errorf("get album %s: %w", albumID, err)
	}

	return mapper.MapAlbumDetail(data), nil
}

func (s *Service) GetBulkAlbums(ctx context.Context, albumIDs []string) []BulkAlbumResult {
	results := make([]BulkAlbumResult, len(albumIDs))
	var wg sync.WaitGroup
	sem := make(chan struct{}, 10)

loop:
	for i, id := range albumIDs {
		select {
		case <-ctx.Done():
			break loop
		case sem <- struct{}{}:
		}

		wg.Add(1)

		go func(idx int, albumID string) {
			defer wg.Done()
			defer func() { <-sem }()

			album, err := s.GetAlbumComplete(ctx, albumID)
			if err != nil {
				results[idx] = BulkAlbumResult{ID: albumID, Error: err.Error()}
				return
			}
			if !servicecommon.IsGeneralReleaseEligible(album.ReleaseDate, time.Now()) {
				results[idx] = BulkAlbumResult{ID: albumID, Error: clients.ErrNotFound.Error()}
				return
			}

			results[idx] = BulkAlbumResult{ID: albumID, Album: &album}
		}(i, id)
	}

	wg.Wait()
	return results
}

func (s *Service) GetTrendingAlbums(ctx context.Context, page, limit int) (SearchResult, error) {
	offset := (page - 1) * limit

	data, err := unmarshalResponse[spotify.SpotifyNewReleasesResponse](s.client.GetTrendingAlbums(ctx, limit, offset))
	if err != nil {
		return SearchResult{}, fmt.Errorf("get trending albums: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Albums.Items))
	for _, album := range data.Albums.Items {
		items = append(items, mapper.MapSearchItem(album))
	}

	totalPages := 0
	if data.Albums.Total > 0 && limit > 0 {
		totalPages = (data.Albums.Total + limit - 1) / limit
	}

	return SearchResult{
		Page:         page,
		TotalPages:   totalPages,
		TotalResults: data.Albums.Total,
		Results:      items,
	}, nil
}
