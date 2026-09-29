package movies

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
)

const safetyMovieFixture = `{
	"id": 123, "title": "Adult Movie", "original_title": "Adult Movie", "adult": true,
	"release_date": "2020-01-01",
	"genres": [{"id": 18, "name": "Drama"}, {"id": 10749, "name": "Romance"}],
	"keywords": {"keywords": [{"id": 1, "name": "erotic movie"}, {"id": 2, "name": "softcore"}]},
	"release_dates": {"results": [
		{"iso_3166_1": "US", "release_dates": [{"certification": "R", "type": 3}]},
		{"iso_3166_1": "DE", "release_dates": [{"certification": "", "type": 3}]}
	]}
}`

func safetyTestHandler(t *testing.T) http.Handler {
	t.Helper()

	client := NewTestClient(func(req *http.Request) *http.Response {
		return &http.Response{
			StatusCode: 200,
			Body:       io.NopCloser(strings.NewReader(safetyMovieFixture)),
			Header:     make(http.Header),
		}
	})

	return setupTestHandler(client)
}

func assertSafetyWire(t *testing.T, movie map[string]any) {
	t.Helper()

	want := map[string]any{
		"adult":          true,
		"genres":         []any{"Drama", "Romance"},
		"keywords":       []any{"erotic movie", "softcore"},
		"certifications": []any{map[string]any{"country": "US", "rating": "R"}},
	}
	for key, wantValue := range want {
		if !reflect.DeepEqual(movie[key], wantValue) {
			t.Errorf("%s = %#v, want %#v", key, movie[key], wantValue)
		}
	}
}

func TestDetailReturnsSafetyMetadata(t *testing.T) {
	w := httptest.NewRecorder()
	safetyTestHandler(t).ServeHTTP(w, httptest.NewRequest("GET", "/movies/123", nil))

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, body %s", w.Code, w.Body.String())
	}

	var movie map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &movie); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	assertSafetyWire(t, movie)
}

func TestBulkReturnsSafetyMetadata(t *testing.T) {
	w := httptest.NewRecorder()
	safetyTestHandler(t).ServeHTTP(w, httptest.NewRequest("GET", "/movies/bulk?ids=123", nil))

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, body %s", w.Code, w.Body.String())
	}

	var movies []map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &movies); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if len(movies) != 1 {
		t.Fatalf("movies = %d, want 1", len(movies))
	}
	assertSafetyWire(t, movies[0])
}
