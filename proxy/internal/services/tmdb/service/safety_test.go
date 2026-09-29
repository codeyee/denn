package service

import (
	"context"
	"encoding/json"
	"net/http"
	"reflect"
	"strings"
	"sync/atomic"
	"testing"

	"github.com/codeyee/denn-proxy/internal/models"
)

const movieSafetyFixture = `{
	"id": 1, "title": "Adult Movie", "adult": true, "release_date": "2020-01-01",
	"genres": [{"id": 18, "name": "Drama"}],
	"keywords": {"keywords": [{"id": 1, "name": "erotic movie"}]},
	"release_dates": {"results": [{"iso_3166_1": "US", "release_dates": [{"certification": "R", "type": 3}]}]}
}`

const tvSafetyFixture = `{
	"id": 2, "name": "Mature Show", "adult": false, "first_air_date": "2020-01-01",
	"genres": [{"id": 18, "name": "Drama"}],
	"keywords": {"results": [{"id": 1, "name": "nudity"}]},
	"content_ratings": {"results": [{"iso_3166_1": "US", "rating": "TV-MA"}]}
}`

func appendSet(query string) map[string]bool {
	set := map[string]bool{}
	for _, part := range strings.Split(query, ",") {
		if part != "" {
			set[part] = true
		}
	}

	return set
}

// recordAppend serves fixture and records how many upstream requests were made
// and what append_to_response each one asked for.
func recordAppend(t *testing.T, fixture string) (*Service, *[]string, *int32) {
	t.Helper()

	var requests int32
	appends := []string{}

	svc := newTestService(func(req *http.Request) (*http.Response, error) {
		atomic.AddInt32(&requests, 1)
		appends = append(appends, req.URL.Query().Get("append_to_response"))
		return makeJSONResponse(200, json.RawMessage(fixture))
	})

	return svc, &appends, &requests
}

func TestGetMovieCompleteReturnsSafetyMetadataFromOneRequest(t *testing.T) {
	svc, appends, requests := recordAppend(t, movieSafetyFixture)

	movie, err := svc.GetMovieComplete(context.Background(), 1, "US")
	if err != nil {
		t.Fatalf("GetMovieComplete failed: %v", err)
	}

	if got := atomic.LoadInt32(requests); got != 1 {
		t.Fatalf("upstream requests = %d, want 1", got)
	}
	for _, want := range []string{"external_ids", "watch/providers", "images", "keywords", "release_dates"} {
		if !appendSet((*appends)[0])[want] {
			t.Errorf("append_to_response %q is missing %q", (*appends)[0], want)
		}
	}

	if movie.Adult == nil || !*movie.Adult {
		t.Errorf("adult = %v, want true", movie.Adult)
	}
	if !reflect.DeepEqual(movie.Genres, []string{"Drama"}) {
		t.Errorf("genres = %#v", movie.Genres)
	}
	if !reflect.DeepEqual(movie.Keywords, []string{"erotic movie"}) {
		t.Errorf("keywords = %#v", movie.Keywords)
	}
	if !reflect.DeepEqual(movie.Certifications, []models.Certification{{Country: "US", Rating: "R"}}) {
		t.Errorf("certifications = %#v", movie.Certifications)
	}
}

func TestGetBulkMoviesReturnsSafetyMetadata(t *testing.T) {
	svc, appends, requests := recordAppend(t, movieSafetyFixture)

	results := svc.GetBulkMovies(context.Background(), []int{1}, "US")

	if len(results) != 1 || results[0].Movie == nil {
		t.Fatalf("results = %#v", results)
	}
	if got := atomic.LoadInt32(requests); got != 1 {
		t.Fatalf("upstream requests = %d, want 1", got)
	}
	if !appendSet((*appends)[0])["keywords"] || !appendSet((*appends)[0])["release_dates"] {
		t.Errorf("append_to_response %q lacks safety appends", (*appends)[0])
	}
	if results[0].Movie.Adult == nil || len(results[0].Movie.Certifications) != 1 {
		t.Errorf("bulk movie lacks safety metadata: %#v", results[0].Movie)
	}
}

func TestGetBulkMoviePreviewsStayWithoutSafetyMetadata(t *testing.T) {
	svc, appends, _ := recordAppend(t, movieSafetyFixture)

	results := svc.GetBulkMoviePreviews(context.Background(), []int{1}, "US")

	if len(results) != 1 || results[0].Movie == nil {
		t.Fatalf("results = %#v", results)
	}
	if got := (*appends)[0]; got != moviePreviewAppend {
		t.Errorf("preview append_to_response = %q, want %q", got, moviePreviewAppend)
	}

	movie := results[0].Movie
	if movie.Adult != nil || movie.Genres != nil || movie.Keywords != nil || movie.Certifications != nil {
		t.Errorf("preview movie carries safety metadata: %#v", movie)
	}
}

func TestGetTVShowCompleteReturnsSafetyMetadataFromOneRequest(t *testing.T) {
	svc, appends, requests := recordAppend(t, tvSafetyFixture)

	show, err := svc.GetTVShowComplete(context.Background(), 2, "US")
	if err != nil {
		t.Fatalf("GetTVShowComplete failed: %v", err)
	}

	if got := atomic.LoadInt32(requests); got != 1 {
		t.Fatalf("upstream requests = %d, want 1", got)
	}
	for _, want := range []string{"external_ids", "watch/providers", "images", "keywords", "content_ratings"} {
		if !appendSet((*appends)[0])[want] {
			t.Errorf("append_to_response %q is missing %q", (*appends)[0], want)
		}
	}

	if show.Adult == nil || *show.Adult {
		t.Errorf("adult = %v, want false", show.Adult)
	}
	if !reflect.DeepEqual(show.Keywords, []string{"nudity"}) {
		t.Errorf("keywords = %#v", show.Keywords)
	}
	if !reflect.DeepEqual(show.Certifications, []models.Certification{{Country: "US", Rating: "TV-MA"}}) {
		t.Errorf("certifications = %#v", show.Certifications)
	}
}

func TestGetBulkTVShowPreviewsStayWithoutSafetyMetadata(t *testing.T) {
	svc, appends, _ := recordAppend(t, tvSafetyFixture)

	results := svc.GetBulkTVShowPreviews(context.Background(), []int{2}, "US")

	if len(results) != 1 || results[0].TVShow == nil {
		t.Fatalf("results = %#v", results)
	}
	if got := (*appends)[0]; got != tvPreviewAppend {
		t.Errorf("preview append_to_response = %q, want %q", got, tvPreviewAppend)
	}

	show := results[0].TVShow
	if show.Adult != nil || show.Genres != nil || show.Keywords != nil || show.Certifications != nil {
		t.Errorf("preview show carries safety metadata: %#v", show)
	}
}
