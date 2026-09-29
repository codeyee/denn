package service

import (
	"context"
	"io"
	"net/http"
	"reflect"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/codeyee/denn-proxy/internal/models"
	"github.com/codeyee/denn-proxy/internal/testutil"
)

const safetyFieldsMarker = "age_ratings.organization.name"

// gameFixture is an IGDB games payload as returned when the safety fields are
// requested (references expanded to objects).
func gameFixture() []map[string]any {
	return []map[string]any{{
		"id":                 7,
		"name":               "Mature Game",
		"first_release_date": time.Now().AddDate(-1, 0, 0).Unix(),
		"keywords":           []map[string]any{{"id": 1, "name": "sex"}},
		"age_ratings": []map[string]any{{
			"id":              10,
			"organization":    map[string]any{"id": 1, "name": "ESRB"},
			"rating_category": map[string]any{"id": 12, "rating": "AO"},
			"rating_content_descriptions": []map[string]any{
				{"id": 1, "description": "Sexual Content"},
			},
		}},
	}}
}

type gamesRecorder struct {
	mu     sync.Mutex
	bodies []string
}

func (r *gamesRecorder) add(body string) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.bodies = append(r.bodies, body)
}

func (r *gamesRecorder) all() []string {
	r.mu.Lock()
	defer r.mu.Unlock()
	return append([]string(nil), r.bodies...)
}

// newRecordingService answers every IGDB games request with gameFixture and
// records each request body sent to the games endpoint. Other IGDB endpoints
// (time to beat) answer with an empty list.
func newRecordingService(t *testing.T) (*Service, *gamesRecorder) {
	t.Helper()

	rec := &gamesRecorder{}
	rt := testutil.MultiHost(
		testutil.HostHandler{Host: twitchAuthHost, Fn: twitchTokenHandler()},
		testutil.HostHandler{Host: igdbAPIHost, Fn: func(req *http.Request) (*http.Response, error) {
			if strings.HasSuffix(req.URL.Path, "/games") {
				raw, _ := io.ReadAll(req.Body)
				rec.add(string(raw))
				return testutil.JSONResponse(http.StatusOK, gameFixture()), nil
			}
			return testutil.JSONResponse(http.StatusOK, []any{}), nil
		}},
	)

	return newServiceWithRouter(t, rt), rec
}

func assertSafetyMetadata(t *testing.T, game models.Game) {
	t.Helper()

	if !reflect.DeepEqual(game.Keywords, []string{"sex"}) {
		t.Errorf("keywords = %#v", game.Keywords)
	}
	want := []models.AgeRating{{Organization: "ESRB", Rating: "AO", Descriptors: []string{"Sexual Content"}}}
	if !reflect.DeepEqual(game.AgeRatings, want) {
		t.Errorf("age ratings = %#v, want %#v", game.AgeRatings, want)
	}
}

func TestGetGameCompleteRequestsAndMapsSafetyMetadata(t *testing.T) {
	svc, rec := newRecordingService(t)

	game, err := svc.GetGameComplete(context.Background(), 7)
	if err != nil {
		t.Fatalf("GetGameComplete failed: %v", err)
	}

	bodies := rec.all()
	if len(bodies) != 1 {
		t.Fatalf("games requests = %d, want 1", len(bodies))
	}
	assertQueryUsesCurrentAgeRatingFields(t, bodies[0])
	assertSafetyMetadata(t, game)
}

func TestGetBulkGamesRequestsAndMapsSafetyMetadata(t *testing.T) {
	svc, rec := newRecordingService(t)

	games, err := svc.GetBulkGames(context.Background(), []int{7})
	if err != nil {
		t.Fatalf("GetBulkGames failed: %v", err)
	}

	bodies := rec.all()
	if len(bodies) != 1 {
		t.Fatalf("games requests = %d, want 1", len(bodies))
	}
	assertQueryUsesCurrentAgeRatingFields(t, bodies[0])
	if len(games) != 1 {
		t.Fatalf("games = %d, want 1", len(games))
	}
	assertSafetyMetadata(t, games[0])
}

func TestTrendingBulkFetchKeepsLightweightQuery(t *testing.T) {
	svc, rec := newRecordingService(t)

	if _, err := svc.getBulkGamePreviews(context.Background(), []int{7}); err != nil {
		t.Fatalf("getBulkGamePreviews failed: %v", err)
	}

	bodies := rec.all()
	if len(bodies) != 1 {
		t.Fatalf("games requests = %d, want 1", len(bodies))
	}
	for _, unwanted := range []string{"age_ratings", "keywords"} {
		if strings.Contains(bodies[0], unwanted) {
			t.Errorf("preview query %q must not request %q", bodies[0], unwanted)
		}
	}
}

func TestTrendingDetailKeepsLightweightQuery(t *testing.T) {
	rec := &gamesRecorder{}
	rt := testutil.MultiHost(
		testutil.HostHandler{Host: twitchAuthHost, Fn: twitchTokenHandler()},
		testutil.HostHandler{Host: igdbAPIHost, Fn: func(req *http.Request) (*http.Response, error) {
			switch {
			case strings.HasSuffix(req.URL.Path, "/popularity_primitives"):
				return testutil.JSONResponse(http.StatusOK, []map[string]any{
					{"game_id": 7, "value": 100.0, "popularity_type": 2},
				}), nil
			case strings.HasSuffix(req.URL.Path, "/games"):
				raw, _ := io.ReadAll(req.Body)
				rec.add(string(raw))
				return testutil.JSONResponse(http.StatusOK, gameFixture()), nil
			default:
				return testutil.JSONResponse(http.StatusOK, []any{}), nil
			}
		}},
	)
	svc := newServiceWithRouter(t, rt)

	games, err := svc.GetTrendingGamesDetail(context.Background(), 10, 0)
	if err != nil {
		t.Fatalf("GetTrendingGamesDetail failed: %v", err)
	}
	if len(games) != 1 {
		t.Fatalf("games = %d, want 1", len(games))
	}

	bodies := rec.all()
	if len(bodies) != 1 {
		t.Fatalf("games requests = %d, want 1", len(bodies))
	}
	if strings.Contains(bodies[0], "age_ratings") || strings.Contains(bodies[0], "keywords") {
		t.Errorf("homepage trending query %q must not request safety fields", bodies[0])
	}
}

func TestSearchPopularAndRecentKeepLightweightQuery(t *testing.T) {
	svc, rec := newRecordingService(t)
	ctx := context.Background()

	if _, err := svc.SearchGames(ctx, "mature", 10, 0); err != nil {
		t.Fatalf("SearchGames failed: %v", err)
	}
	if _, err := svc.GetPopularGames(ctx, 10, 0); err != nil {
		t.Fatalf("GetPopularGames failed: %v", err)
	}
	if _, err := svc.GetRecentGames(ctx, 10, 0); err != nil {
		t.Fatalf("GetRecentGames failed: %v", err)
	}

	bodies := rec.all()
	if len(bodies) != 3 {
		t.Fatalf("games requests = %d, want 3", len(bodies))
	}
	for _, body := range bodies {
		if strings.Contains(body, "age_ratings") || strings.Contains(body, "keywords") {
			t.Errorf("list query %q must not request safety fields", body)
		}
	}
}

func assertQueryUsesCurrentAgeRatingFields(t *testing.T, body string) {
	t.Helper()

	for _, want := range []string{
		"keywords.name",
		safetyFieldsMarker,
		"age_ratings.rating_category.rating",
		"age_ratings.rating_content_descriptions.description",
	} {
		if !strings.Contains(body, want) {
			t.Errorf("query %q lacks %q", body, want)
		}
	}

	// The deprecated fields must not be requested. Check as whole field
	// tokens so the current age_ratings.* fields do not match.
	for _, field := range strings.Split(strings.SplitN(strings.TrimPrefix(body, "fields "), ";", 2)[0], ",") {
		switch field {
		case "age_ratings", "age_ratings.category", "age_ratings.rating", "age_ratings.content_descriptions":
			t.Errorf("query requests deprecated field %q", field)
		}
	}
}
