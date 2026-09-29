package mapper

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/codeyee/denn-proxy/internal/models"
	"github.com/codeyee/denn-proxy/internal/services/tmdb"
)

func decodeJSON[T any](t *testing.T, payload string) T {
	t.Helper()

	var out T
	if err := json.Unmarshal([]byte(payload), &out); err != nil {
		t.Fatalf("decode fixture: %v", err)
	}

	return out
}

func TestMapMovieDetailSafetyMetadata(t *testing.T) {
	boolPtr := func(b bool) *bool { return &b }

	tests := []struct {
		name               string
		payload            string
		wantAdult          *bool
		wantGenres         []string
		wantKeywords       []string
		wantCertifications []models.Certification
	}{
		{
			name: "adult movie with keywords and multi-country release dates",
			payload: `{
				"id": 1, "title": "Adult Movie", "adult": true,
				"genres": [{"id": 18, "name": "Drama"}, {"id": 10749, "name": " Romance "}, {"id": 18, "name": "Drama"}],
				"keywords": {"keywords": [{"id": 1, "name": "erotic movie"}, {"id": 2, "name": "softcore"}, {"id": 3, "name": "  "}, {"id": 4, "name": "erotic movie"}]},
				"release_dates": {"results": [
					{"iso_3166_1": "US", "release_dates": [
						{"certification": "", "type": 1},
						{"certification": "NC-17", "type": 4},
						{"certification": "R", "type": 3},
						{"certification": "PG-13", "type": 3}
					]},
					{"iso_3166_1": "DE", "release_dates": [
						{"certification": "", "type": 3},
						{"certification": "18", "type": 5},
						{"certification": "16", "type": 6}
					]},
					{"iso_3166_1": "FR", "release_dates": [{"certification": "", "type": 3}]},
					{"iso_3166_1": "GB", "release_dates": []},
					{"iso_3166_1": "", "release_dates": [{"certification": "X", "type": 3}]},
					{"iso_3166_1": "US", "release_dates": [{"certification": "G", "type": 3}]}
				]}
			}`,
			wantAdult:    boolPtr(true),
			wantGenres:   []string{"Drama", "Romance"},
			wantKeywords: []string{"erotic movie", "softcore"},
			wantCertifications: []models.Certification{
				{Country: "US", Rating: "R"},
				{Country: "DE", Rating: "18"},
			},
		},
		{
			name: "explicit adult false is preserved",
			payload: `{
				"id": 2, "title": "Family Movie", "adult": false,
				"genres": [{"id": 16, "name": "Animation"}],
				"keywords": {"keywords": []},
				"release_dates": {"results": [{"iso_3166_1": "US", "release_dates": [{"certification": "G", "type": 3}]}]}
			}`,
			wantAdult:          boolPtr(false),
			wantGenres:         []string{"Animation"},
			wantCertifications: []models.Certification{{Country: "US", Rating: "G"}},
		},
		{
			name:    "fields TMDB did not send stay absent",
			payload: `{"id": 3, "title": "Bare Movie"}`,
		},
		{
			name: "empty appended objects stay absent",
			payload: `{
				"id": 4, "title": "Empty Movie", "adult": null, "genres": [],
				"keywords": {}, "release_dates": {"results": []}
			}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			movie := MapMovieDetail(decodeJSON[tmdb.TmdbMovieDetail](t, tt.payload), "US")

			if !reflect.DeepEqual(movie.Adult, tt.wantAdult) {
				t.Errorf("adult = %v, want %v", derefBool(movie.Adult), derefBool(tt.wantAdult))
			}
			if !reflect.DeepEqual(movie.Genres, tt.wantGenres) {
				t.Errorf("genres = %#v, want %#v", movie.Genres, tt.wantGenres)
			}
			if !reflect.DeepEqual(movie.Keywords, tt.wantKeywords) {
				t.Errorf("keywords = %#v, want %#v", movie.Keywords, tt.wantKeywords)
			}
			if !reflect.DeepEqual(movie.Certifications, tt.wantCertifications) {
				t.Errorf("certifications = %#v, want %#v", movie.Certifications, tt.wantCertifications)
			}
		})
	}
}

func TestMapMovieDetailResponseJSON(t *testing.T) {
	full := MapMovieDetail(decodeJSON[tmdb.TmdbMovieDetail](t, `{
		"id": 1, "title": "Adult Movie", "adult": false,
		"genres": [{"id": 18, "name": "Drama"}],
		"keywords": {"keywords": [{"id": 1, "name": "softcore"}]},
		"release_dates": {"results": [{"iso_3166_1": "US", "release_dates": [{"certification": "R", "type": 3}]}]}
	}`), "US")

	got := marshalToMap(t, full.ToResponse())
	want := map[string]any{
		"adult":          false,
		"genres":         []any{"Drama"},
		"keywords":       []any{"softcore"},
		"certifications": []any{map[string]any{"country": "US", "rating": "R"}},
	}
	for key, wantValue := range want {
		if !reflect.DeepEqual(got[key], wantValue) {
			t.Errorf("response[%q] = %#v, want %#v", key, got[key], wantValue)
		}
	}

	bareMovie := MapMovieDetail(decodeJSON[tmdb.TmdbMovieDetail](t, `{"id": 3, "title": "Bare"}`), "US")
	bare := marshalToMap(t, bareMovie.ToResponse())
	for _, key := range []string{"adult", "genres", "keywords", "certifications"} {
		if _, present := bare[key]; present {
			t.Errorf("response has %q for a movie TMDB sent no safety data for", key)
		}
	}
}

func TestMapMovieLeavesSafetyMetadataOutOfPreviews(t *testing.T) {
	detail := decodeJSON[tmdb.TmdbMovieDetail](t, `{
		"id": 1, "title": "Adult Movie", "adult": true,
		"genres": [{"id": 18, "name": "Drama"}]
	}`)

	preview := MapMovie(detail, "US")
	response := marshalToMap(t, preview.ToResponse())
	for _, key := range []string{"adult", "genres", "keywords", "certifications"} {
		if _, present := response[key]; present {
			t.Errorf("MapMovie response has %q; only MapMovieDetail may set safety metadata", key)
		}
	}
}

func TestMapTVShowDetailSafetyMetadata(t *testing.T) {
	boolPtr := func(b bool) *bool { return &b }

	tests := []struct {
		name               string
		payload            string
		wantAdult          *bool
		wantGenres         []string
		wantKeywords       []string
		wantCertifications []models.Certification
	}{
		{
			name: "content ratings and keywords results",
			payload: `{
				"id": 10, "name": "Mature Show", "adult": false,
				"genres": [{"id": 18, "name": "Drama"}, {"id": 9648, "name": "Mystery"}],
				"keywords": {"results": [{"id": 1, "name": "nudity"}, {"id": 2, "name": " violence "}, {"id": 3, "name": "nudity"}]},
				"content_ratings": {"results": [
					{"iso_3166_1": "US", "rating": "TV-MA"},
					{"iso_3166_1": "DE", "rating": "16"},
					{"iso_3166_1": "GB", "rating": ""},
					{"iso_3166_1": "FR", "rating": "  "},
					{"iso_3166_1": "US", "rating": "TV-MA"},
					{"iso_3166_1": "", "rating": "18"}
				]}
			}`,
			wantAdult:    boolPtr(false),
			wantGenres:   []string{"Drama", "Mystery"},
			wantKeywords: []string{"nudity", "violence"},
			wantCertifications: []models.Certification{
				{Country: "US", Rating: "TV-MA"},
				{Country: "DE", Rating: "16"},
			},
		},
		{
			name:      "adult true",
			payload:   `{"id": 11, "name": "Adult Show", "adult": true}`,
			wantAdult: boolPtr(true),
		},
		{
			name:    "fields TMDB did not send stay absent",
			payload: `{"id": 12, "name": "Bare Show"}`,
		},
		{
			name:    "empty appended objects stay absent",
			payload: `{"id": 13, "name": "Empty Show", "keywords": {"results": []}, "content_ratings": {"results": []}}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			show := MapTVShowDetail(decodeJSON[tmdb.TmdbTVDetail](t, tt.payload), "US")

			if !reflect.DeepEqual(show.Adult, tt.wantAdult) {
				t.Errorf("adult = %v, want %v", derefBool(show.Adult), derefBool(tt.wantAdult))
			}
			if !reflect.DeepEqual(show.Genres, tt.wantGenres) {
				t.Errorf("genres = %#v, want %#v", show.Genres, tt.wantGenres)
			}
			if !reflect.DeepEqual(show.Keywords, tt.wantKeywords) {
				t.Errorf("keywords = %#v, want %#v", show.Keywords, tt.wantKeywords)
			}
			if !reflect.DeepEqual(show.Certifications, tt.wantCertifications) {
				t.Errorf("certifications = %#v, want %#v", show.Certifications, tt.wantCertifications)
			}
		})
	}
}

func TestMapTVShowLeavesSafetyMetadataOutOfPreviews(t *testing.T) {
	detail := decodeJSON[tmdb.TmdbTVDetail](t, `{"id": 10, "name": "Show", "adult": true, "genres": [{"id": 18, "name": "Drama"}]}`)

	preview := MapTVShow(detail, "US")
	response := marshalToMap(t, preview.ToResponse())
	for _, key := range []string{"adult", "genres", "keywords", "certifications"} {
		if _, present := response[key]; present {
			t.Errorf("MapTVShow response has %q; only MapTVShowDetail may set safety metadata", key)
		}
	}
}

func marshalToMap(t *testing.T, v any) map[string]any {
	t.Helper()

	raw, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}

	var out map[string]any
	if err := json.Unmarshal(raw, &out); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}

	return out
}

func derefBool(b *bool) any {
	if b == nil {
		return nil
	}

	return *b
}
