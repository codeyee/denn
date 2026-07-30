package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/models"
	tmdbclient "github.com/codeyee/denn-proxy/internal/providers/tmdb"
	servicecommon "github.com/codeyee/denn-proxy/internal/services/common"
	"github.com/codeyee/denn-proxy/internal/services/tmdb"
	"github.com/codeyee/denn-proxy/internal/services/tmdb/mapper"
)

const (
	movieAppend = "external_ids,watch/providers,images"
	tvAppend    = "external_ids,watch/providers,images"

	// previewAppend is used by homepage card enrichment. Watch providers
	// and image galleries are detail-page concerns; pulling them for every
	// homepage card multiplies TMDB payload size by ~4x and forces TMDB to
	// stitch country-specific watch data we don't render in the cards.
	moviePreviewAppend = "external_ids"
	tvPreviewAppend    = "external_ids"
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

	if cerr := servicecommon.ClassifyStatus("TMDB", resp.StatusCode); cerr != nil {
		return zero, cerr
	}

	var result T

	if err := json.Unmarshal(resp.Data, &result); err != nil {
		return zero, fmt.Errorf("failed to unmarshal TMDB response: %w", err)
	}

	return result, nil
}

func (s *Service) SearchMovies(ctx context.Context, query string, page, limit int) (SearchResult, error) {
	return s.SearchMoviesWithAdult(ctx, query, page, limit, false)
}

func (s *Service) SearchMoviesWithAdult(
	ctx context.Context,
	query string,
	page, limit int,
	allowAdult bool,
) (SearchResult, error) {
	data, err := unmarshalResponse[tmdb.TmdbSearchResponse](
		s.client.SearchMoviesWithAdult(ctx, query, page, allowAdult),
	)

	if err != nil {
		return SearchResult{}, fmt.Errorf("search movies: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Results))

	for _, r := range data.Results {
		if r.Adult && !allowAdult {
			continue
		}
		items = append(items, mapper.MapSearchItemMovie(r))
	}
	items = servicecommon.FilterEligibleSearchItems(items, time.Now())

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
	return s.SearchTVShowsWithAdult(ctx, query, page, limit, false)
}

func (s *Service) SearchTVShowsWithAdult(
	ctx context.Context,
	query string,
	page, limit int,
	allowAdult bool,
) (SearchResult, error) {
	data, err := unmarshalResponse[tmdb.TmdbSearchResponse](
		s.client.SearchTVShowsWithAdult(ctx, query, page, allowAdult),
	)

	if err != nil {
		return SearchResult{}, fmt.Errorf("search tv shows: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Results))

	for _, r := range data.Results {
		if r.Adult && !allowAdult {
			continue
		}
		items = append(items, mapper.MapSearchItemTV(r))
	}
	items = servicecommon.FilterEligibleSearchItems(items, time.Now())

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
	data, err := unmarshalResponse[tmdb.TmdbSearchResponse](s.client.GetPopularMovies(ctx, page))

	if err != nil {
		return SearchResult{}, fmt.Errorf("popular movies: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Results))

	for _, r := range data.Results {
		if r.Adult {
			continue
		}
		items = append(items, mapper.MapSearchItemMovie(r))
	}
	items = servicecommon.FilterEligibleSearchItems(items, time.Now())

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
	data, err := unmarshalResponse[tmdb.TmdbSearchResponse](s.client.GetPopularTVShows(ctx, page))

	if err != nil {
		return SearchResult{}, fmt.Errorf("popular tv shows: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Results))

	for _, r := range data.Results {
		if r.Adult {
			continue
		}
		items = append(items, mapper.MapSearchItemTV(r))
	}
	items = servicecommon.FilterEligibleSearchItems(items, time.Now())

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

func (s *Service) GetRecentMovies(ctx context.Context, page, limit int) (SearchResult, error) {
	until := time.Now().UTC().Format("2006-01-02")
	data, err := unmarshalResponse[tmdb.TmdbSearchResponse](s.client.GetRecentMovies(ctx, page, until))
	if err != nil {
		return SearchResult{}, fmt.Errorf("recent movies: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Results))
	for _, r := range data.Results {
		if r.Adult {
			continue
		}
		items = append(items, mapper.MapSearchItemMovie(r))
	}
	items = servicecommon.FilterEligibleSearchItems(items, time.Now())
	if len(items) > limit {
		items = items[:limit]
	}

	return SearchResult{Page: data.Page, TotalPages: data.TotalPages, TotalResults: data.TotalResults, Results: items}, nil
}

func (s *Service) GetRecentTVShows(ctx context.Context, page, limit int) (SearchResult, error) {
	until := time.Now().UTC().Format("2006-01-02")
	data, err := unmarshalResponse[tmdb.TmdbSearchResponse](s.client.GetRecentTVShows(ctx, page, until))
	if err != nil {
		return SearchResult{}, fmt.Errorf("recent tv shows: %w", err)
	}

	items := make([]models.SearchItem, 0, len(data.Results))
	for _, r := range data.Results {
		if r.Adult {
			continue
		}
		items = append(items, mapper.MapSearchItemTV(r))
	}
	items = servicecommon.FilterEligibleSearchItems(items, time.Now())
	if len(items) > limit {
		items = items[:limit]
	}

	return SearchResult{Page: data.Page, TotalPages: data.TotalPages, TotalResults: data.TotalResults, Results: items}, nil
}

func (s *Service) GetMovieComplete(ctx context.Context, movieID int, country string) (models.Movie, error) {
	data, err := unmarshalResponse[tmdb.TmdbMovieDetail](
		s.client.GetMovieDetails(ctx, movieID, movieAppend),
	)

	if err != nil {
		return models.Movie{}, fmt.Errorf("get movie %d: %w", movieID, err)
	}

	return mapper.MapMovie(data, country), nil
}

func (s *Service) GetTVShowComplete(ctx context.Context, tvID int, country string) (models.TVShow, error) {
	data, err := unmarshalResponse[tmdb.TmdbTVDetail](
		s.client.GetTVDetails(ctx, tvID, tvAppend),
	)

	if err != nil {
		return models.TVShow{}, fmt.Errorf("get tv show %d: %w", tvID, err)
	}

	show := mapper.MapTVShow(data, country)

	seasons := make([]models.Season, 0, len(data.Seasons))

	for _, s := range data.Seasons {
		if mapper.IsValidSeason(s) {
			seasons = append(seasons, mapper.MapSeasonSummary(s))
		}
	}
	show.Seasons = servicecommon.FilterValidSeasonSummaries(seasons, time.Now())

	return show, nil
}

func (s *Service) GetSeasonComplete(ctx context.Context, tvID, seasonNumber int, country string) (models.Season, error) {
	type seasonData struct {
		detail    tmdb.TmdbSeasonDetail
		tvDetail  tmdb.TmdbTVDetail
		images    *tmdb.TmdbImagesResponse
		providers *tmdb.TmdbWatchProvidersResponse
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
		data, err := unmarshalResponse[tmdb.TmdbSeasonDetail](
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
		data, err := unmarshalResponse[tmdb.TmdbTVDetail](
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
		data, err := unmarshalResponse[tmdb.TmdbImagesResponse](
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
		data, err := unmarshalResponse[tmdb.TmdbWatchProvidersResponse](
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

	season := mapper.MapSeason(sd.detail, sd.tvDetail.Name, sd.images, sd.providers, country)
	if !servicecommon.IsValidSeasonContent(season, time.Now()) {
		return models.Season{}, fmt.Errorf("season detail: %w", clients.ErrNotFound)
	}
	return season, nil
}

// GetMoviePreview is the homepage-card variant of GetMovieComplete. It hits
// the same /movie/{id} endpoint but skips the watch-providers and images
// appends so payloads stay small. Detail routes still call GetMovieComplete
// so individual movie pages keep their full data.
func (s *Service) GetMoviePreview(ctx context.Context, movieID int, country string) (models.Movie, error) {
	data, err := unmarshalResponse[tmdb.TmdbMovieDetail](
		s.client.GetMovieDetails(ctx, movieID, moviePreviewAppend),
	)
	if err != nil {
		return models.Movie{}, fmt.Errorf("get movie preview %d: %w", movieID, err)
	}
	movie := mapper.MapMovie(data, country)
	if !servicecommon.IsGeneralReleaseEligible(movie.ReleaseDate, time.Now()) {
		return models.Movie{}, fmt.Errorf("get movie preview %d: %w", movieID, clients.ErrNotFound)
	}
	return movie, nil
}

// GetTVShowPreview mirrors GetMoviePreview for TV shows. Season list is
// derived from the base detail payload so card rendering stays correct.
func (s *Service) GetTVShowPreview(ctx context.Context, tvID int, country string) (models.TVShow, error) {
	data, err := unmarshalResponse[tmdb.TmdbTVDetail](
		s.client.GetTVDetails(ctx, tvID, tvPreviewAppend),
	)
	if err != nil {
		return models.TVShow{}, fmt.Errorf("get tv preview %d: %w", tvID, err)
	}
	show := mapper.MapTVShow(data, country)
	seasons := make([]models.Season, 0, len(data.Seasons))
	for _, season := range data.Seasons {
		if mapper.IsValidSeason(season) {
			seasons = append(seasons, mapper.MapSeasonSummary(season))
		}
	}
	show.Seasons = servicecommon.FilterValidSeasonSummaries(seasons, time.Now())
	if !servicecommon.IsGeneralReleaseEligible(show.ReleaseDate, time.Now()) {
		return models.TVShow{}, fmt.Errorf("get tv preview %d: %w", tvID, clients.ErrNotFound)
	}
	return show, nil
}

// GetBulkMoviePreviews mirrors GetBulkMovies but uses the lightweight
// preview endpoint, dropping ~75% of TMDB payload bytes for /homepage.
func (s *Service) GetBulkMoviePreviews(ctx context.Context, ids []int, country string) []BulkMovieResult {
	return s.bulkMovies(ctx, ids, country, s.GetMoviePreview)
}

// GetBulkTVShowPreviews is the TV equivalent of GetBulkMoviePreviews.
func (s *Service) GetBulkTVShowPreviews(ctx context.Context, ids []int, country string) []BulkTVShowResult {
	return s.bulkTVShows(ctx, ids, country, s.GetTVShowPreview)
}

func (s *Service) bulkMovies(
	ctx context.Context,
	ids []int,
	country string,
	fetch func(context.Context, int, string) (models.Movie, error),
) []BulkMovieResult {
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
			movie, err := fetch(ctx, movieID, country)
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

func (s *Service) bulkTVShows(
	ctx context.Context,
	ids []int,
	country string,
	fetch func(context.Context, int, string) (models.TVShow, error),
) []BulkTVShowResult {
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
			show, err := fetch(ctx, tvID, country)
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

func (s *Service) GetBulkMovies(ctx context.Context, ids []int, country string) []BulkMovieResult {
	return s.bulkMovies(ctx, ids, country, s.GetMovieComplete)
}

func (s *Service) GetBulkTVShows(ctx context.Context, ids []int, country string) []BulkTVShowResult {
	return s.bulkTVShows(ctx, ids, country, s.GetTVShowComplete)
}
