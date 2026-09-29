package mapper

import (
	"encoding/json"
	"reflect"
	"testing"

	"github.com/codeyee/denn-proxy/internal/models"
	"github.com/codeyee/denn-proxy/internal/services/games"
)

func TestMapGameSafetyMetadata(t *testing.T) {
	tests := []struct {
		name           string
		payload        string
		wantKeywords   []string
		wantAgeRatings []models.AgeRating
	}{
		{
			name: "expanded ESRB and PEGI ratings with descriptors",
			payload: `{
				"id": 1, "name": "Mature Game",
				"keywords": [{"id": 1, "name": "sex"}, {"id": 2, "name": " dating sim "}, {"id": 3, "name": ""}, {"id": 4, "name": "sex"}],
				"age_ratings": [
					{
						"id": 10,
						"organization": {"id": 1, "name": "ESRB"},
						"rating_category": {"id": 12, "rating": "M"},
						"rating_content_descriptions": [
							{"id": 1, "description": "Blood and Gore"},
							{"id": 2, "description": " Nudity "},
							{"id": 3, "description": "Blood and Gore"}
						]
					},
					{
						"id": 11,
						"organization": {"id": 2, "name": "PEGI"},
						"rating_category": {"id": 5, "rating": "18"}
					}
				]
			}`,
			wantKeywords: []string{"sex", "dating sim"},
			wantAgeRatings: []models.AgeRating{
				{Organization: "ESRB", Rating: "M", Descriptors: []string{"Blood and Gore", "Nudity"}},
				{Organization: "PEGI", Rating: "18"},
			},
		},
		{
			name: "adults only rating",
			payload: `{
				"id": 2, "name": "AO Game",
				"age_ratings": [{
					"organization": {"name": "ESRB"},
					"rating_category": {"rating": "AO"},
					"rating_content_descriptions": [{"description": "Sexual Content"}]
				}]
			}`,
			wantAgeRatings: []models.AgeRating{
				{Organization: "ESRB", Rating: "AO", Descriptors: []string{"Sexual Content"}},
			},
		},
		{
			name: "entries missing organization or rating are skipped",
			payload: `{
				"id": 3, "name": "Partial Game",
				"age_ratings": [
					{"id": 1, "rating_category": {"rating": "M"}},
					{"id": 2, "organization": {"name": "ESRB"}},
					{"id": 3, "organization": {"name": "  "}, "rating_category": {"rating": "M"}},
					{"id": 4, "organization": {"name": "CERO"}, "rating_category": {"rating": ""}},
					{"id": 5, "organization": {"name": "USK"}, "rating_category": {"rating": "16"}, "rating_content_descriptions": []}
				]
			}`,
			wantAgeRatings: []models.AgeRating{{Organization: "USK", Rating: "16"}},
		},
		{
			name: "repeated organization and rating merge descriptors",
			payload: `{
				"id": 4, "name": "Repeated Game",
				"age_ratings": [
					{"organization": {"name": "ESRB"}, "rating_category": {"rating": "M"}, "rating_content_descriptions": [{"description": "Violence"}]},
					{"organization": {"name": "ESRB"}, "rating_category": {"rating": "M"}, "rating_content_descriptions": [{"description": "Violence"}, {"description": "Strong Language"}]}
				]
			}`,
			wantAgeRatings: []models.AgeRating{
				{Organization: "ESRB", Rating: "M", Descriptors: []string{"Violence", "Strong Language"}},
			},
		},
		{
			name:    "fields IGDB did not send stay absent",
			payload: `{"id": 5, "name": "Bare Game"}`,
		},
		{
			name:    "empty lists stay absent",
			payload: `{"id": 6, "name": "Empty Game", "keywords": [], "age_ratings": []}`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var item games.IgdbGame
			if err := json.Unmarshal([]byte(tt.payload), &item); err != nil {
				t.Fatalf("decode fixture: %v", err)
			}

			game := MapGame(item)

			if !reflect.DeepEqual(game.Keywords, tt.wantKeywords) {
				t.Errorf("keywords = %#v, want %#v", game.Keywords, tt.wantKeywords)
			}
			if !reflect.DeepEqual(game.AgeRatings, tt.wantAgeRatings) {
				t.Errorf("age ratings = %#v, want %#v", game.AgeRatings, tt.wantAgeRatings)
			}
		})
	}
}

func TestMapGameResponseOmitsAbsentSafetyMetadata(t *testing.T) {
	game := MapGame(games.IgdbGame{ID: 1, Name: "Bare Game"})
	raw, err := json.Marshal(game.ToResponse())
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}

	var response map[string]any
	if err := json.Unmarshal(raw, &response); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}

	for _, key := range []string{"keywords", "age_ratings"} {
		if _, present := response[key]; present {
			t.Errorf("response has %q for a game IGDB sent no safety data for", key)
		}
	}
}
