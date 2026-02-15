package tmdb

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/models"
	tmdbclient "github.com/codeyee/denn-proxy/internal/providers/tmdb"
)

const (
	movieAppend = "external_ids,watch/providers,images"
	tvAppend    = "external_ids,watch/providers,images"
)

type SearchResult struct {
	Page         int                 `json:"page"`
	TotalPages   int                 `json:"total_pages"`
	TotalResults int                 `json:"total_results"`
	Results      []models.SearchItem `json:"results"`
}

type BulkMovieResult struct {
	ID    int           `json:"id"`
	Movie *models.Movie `json:"data,omitempty"`
	Error string        `json:"error,omitempty"`
}

type BulkTVShowResult struct {
	ID     int            `json:"id"`
	TVShow *models.TVShow `json:"data,omitempty"`
	Error  string         `json:"error,omitempty"`
}

type Service struct {
	client *tmdbclient.Client
}

func NewService(client *tmdbclient.Client) *Service {
	return &Service{client: client}
}

func unmarshalResponse[T any](resp *clients.Response, err error) (T, error) {
	var zero T

	if err != nil {
		return zero, err
	}

	if resp.StatusCode == 404 {
		return zero, fmt.Errorf("TMDB %w", clients.ErrNotFound)
	}

	if resp.StatusCode != 200 {
		return zero, fmt.Errorf("TMDB API error (status %d)", resp.StatusCode)
	}

	var result T

	if err := json.Unmarshal(resp.Data, &result); err != nil {
		return zero, fmt.Errorf("failed to unmarshal TMDB response: %w", err)
	}

	return result, nil
}

func (s *Service) SearchMovies(ctx context.Context, query string, page, limit int) (SearchResult, error) {
	data, err := unmarshalResponse[tmdbSearchResponse](s.client.SearchMovies(ctx, query, page))

	if err != nil {
		return SearchResult{}, fmt.Errorf("search movies: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Results))

	for _, r := range data.Results {
		items = append(items, mapSearchItemMovie(r))
	}

	if len(items) > limit {
		items = items[:limit]
	}

	return SearchResult{
		Page:         data.Page,
		TotalPages:   data.TotalPages,
		TotalResults: data.TotalResults,
		Results:      items,
	}, nil
}

func (s *Service) SearchTVShows(ctx context.Context, query string, page, limit int) (SearchResult, error) {
	data, err := unmarshalResponse[tmdbSearchResponse](s.client.SearchTVShows(ctx, query, page))

	if err != nil {
		return SearchResult{}, fmt.Errorf("search tv shows: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Results))

	for _, r := range data.Results {
		items = append(items, mapSearchItemTV(r))
	}

	if len(items) > limit {
		items = items[:limit]
	}

	return SearchResult{
		Page:         data.Page,
		TotalPages:   data.TotalPages,
		TotalResults: data.TotalResults,
		Results:      items,
	}, nil
}

func (s *Service) GetPopularMovies(ctx context.Context, page, limit int) (SearchResult, error) {
	data, err := unmarshalResponse[tmdbSearchResponse](s.client.GetPopularMovies(ctx, page))

	if err != nil {
		return SearchResult{}, fmt.Errorf("popular movies: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Results))

	for _, r := range data.Results {
		items = append(items, mapSearchItemMovie(r))
	}

	if len(items) > limit {
		items = items[:limit]
	}

	return SearchResult{
		Page:         data.Page,
		TotalPages:   data.TotalPages,
		TotalResults: data.TotalResults,
		Results:      items,
	}, nil
}

func (s *Service) GetPopularTVShows(ctx context.Context, page, limit int) (SearchResult, error) {
	data, err := unmarshalResponse[tmdbSearchResponse](s.client.GetPopularTVShows(ctx, page))

	if err != nil {
		return SearchResult{}, fmt.Errorf("popular tv shows: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Results))

	for _, r := range data.Results {
		items = append(items, mapSearchItemTV(r))
	}

	if len(items) > limit {
		items = items[:limit]
	}

	return SearchResult{
		Page:         data.Page,
		TotalPages:   data.TotalPages,
		TotalResults: data.TotalResults,
		Results:      items,
	}, nil
}

func (s *Service) GetMovieComplete(ctx context.Context, movieID int, country string) (models.Movie, error) {
	data, err := unmarshalResponse[tmdbMovieDetail](
		s.client.GetMovieDetails(ctx, movieID, movieAppend),
	)

	if err != nil {
		return models.Movie{}, fmt.Errorf("get movie %d: %w", movieID, err)
	}

	return mapMovie(data, country), nil
}

func (s *Service) GetTVShowComplete(ctx context.Context, tvID int, country string) (models.TVShow, error) {
	data, err := unmarshalResponse[tmdbTVDetail](
		s.client.GetTVDetails(ctx, tvID, tvAppend),
	)

	if err != nil {
		return models.TVShow{}, fmt.Errorf("get tv show %d: %w", tvID, err)
	}

	show := mapTVShow(data, country)

	seasons := make([]models.Season, 0, len(data.Seasons))

	for _, s := range data.Seasons {
		if isValidSeason(s) {
			seasons = append(seasons, mapSeasonSummary(s))
		}
	}

	show.Seasons = seasons

	return show, nil
}

func (s *Service) GetSeasonComplete(ctx context.Context, tvID, seasonNumber int, country string) (models.Season, error) {
	type seasonData struct {
		detail    tmdbSeasonDetail
		tvDetail  tmdbTVDetail
		images    *tmdbImagesResponse
		providers *tmdbWatchProvidersResponse
	}

	var (
		sd        seasonData
		mu        sync.Mutex
		wg        sync.WaitGroup
		detailErr error
	)

	wg.Add(4)

	go func() {
		defer wg.Done()
		data, err := unmarshalResponse[tmdbSeasonDetail](
			s.client.GetSeasonDetails(ctx, tvID, seasonNumber),
		)
		mu.Lock()
		defer mu.Unlock()
		if err != nil {
			detailErr = fmt.Errorf("season detail: %w", err)
			return
		}
		sd.detail = data
	}()

	go func() {
		defer wg.Done()
		data, err := unmarshalResponse[tmdbTVDetail](
			s.client.GetTVDetails(ctx, tvID, ""),
		)
		mu.Lock()
		defer mu.Unlock()
		if err != nil {
			log.Printf("failed to fetch tv detail for season context (tv %d): %v", tvID, err)
			return
		}
		sd.tvDetail = data
	}()

	go func() {
		defer wg.Done()
		data, err := unmarshalResponse[tmdbImagesResponse](
			s.client.GetSeasonImages(ctx, tvID, seasonNumber),
		)
		mu.Lock()
		defer mu.Unlock()
		if err != nil {
			log.Printf("failed to fetch season images (tv %d, season %d): %v", tvID, seasonNumber, err)
			return
		}
		sd.images = &data
	}()

	go func() {
		defer wg.Done()
		data, err := unmarshalResponse[tmdbWatchProvidersResponse](
			s.client.GetSeasonWatchProviders(ctx, tvID, seasonNumber),
		)
		mu.Lock()
		defer mu.Unlock()
		if err != nil {
			log.Printf("failed to fetch season watch providers (tv %d, season %d): %v", tvID, seasonNumber, err)
			return
		}
		sd.providers = &data
	}()

	wg.Wait()

	if detailErr != nil {
		return models.Season{}, detailErr
	}

	return mapSeason(sd.detail, sd.tvDetail.Name, sd.images, sd.providers, country), nil
}

func (s *Service) GetBulkMovies(ctx context.Context, ids []int, country string) []BulkMovieResult {
	results := make([]BulkMovieResult, len(ids))
	var wg sync.WaitGroup
	sem := make(chan struct{}, 10)

loop:
	for i, id := range ids {
		select {
		case <-ctx.Done():
			break loop
		case sem <- struct{}{}:
		}

		wg.Add(1)

		go func(idx, movieID int) {
			defer wg.Done()
			defer func() { <-sem }()

			movie, err := s.GetMovieComplete(ctx, movieID, country)
			if err != nil {
				results[idx] = BulkMovieResult{ID: movieID, Error: err.Error()}
				return
			}

			results[idx] = BulkMovieResult{ID: movieID, Movie: &movie}
		}(i, id)
	}

	wg.Wait()
	return results
}

func (s *Service) GetBulkTVShows(ctx context.Context, ids []int, country string) []BulkTVShowResult {
	results := make([]BulkTVShowResult, len(ids))
	var wg sync.WaitGroup
	sem := make(chan struct{}, 10)

loop:
	for i, id := range ids {
		select {
		case <-ctx.Done():
			break loop
		case sem <- struct{}{}:
		}

		wg.Add(1)

		go func(idx, tvID int) {
			defer wg.Done()
			defer func() { <-sem }()

			show, err := s.GetTVShowComplete(ctx, tvID, country)
			if err != nil {
				results[idx] = BulkTVShowResult{ID: tvID, Error: err.Error()}
				return
			}

			results[idx] = BulkTVShowResult{ID: tvID, TVShow: &show}
		}(i, id)
	}

	wg.Wait()
	return results
}
