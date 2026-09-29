package mapper

import (
	"encoding/json"
	"testing"

	"github.com/codeyee/denn-proxy/internal/services/spotify"
)

func TestMapAlbumDetailTrackExplicit(t *testing.T) {
	// Track objects as returned inside GET /albums/{id}.
	payload := `{
		"id": "album1", "name": "Album", "total_tracks": 3,
		"tracks": {"items": [
			{"id": "t1", "name": "Explicit Track", "track_number": 1, "duration_ms": 1000, "explicit": true},
			{"id": "t2", "name": "Clean Track", "track_number": 2, "duration_ms": 1000, "explicit": false},
			{"id": "t3", "name": "Unknown Track", "track_number": 3, "duration_ms": 1000}
		]}
	}`

	var album spotify.SpotifyAlbum
	if err := json.Unmarshal([]byte(payload), &album); err != nil {
		t.Fatalf("decode fixture: %v", err)
	}

	detail := MapAlbumDetail(album)
	response := detail.ToResponse()

	tests := []struct {
		name         string
		trackIndex   int
		wantExplicit *bool
	}{
		{name: "explicit true", trackIndex: 0, wantExplicit: boolPtr(true)},
		{name: "explicit false is preserved", trackIndex: 1, wantExplicit: boolPtr(false)},
		{name: "explicit absent stays absent", trackIndex: 2, wantExplicit: nil},
	}

	raw, err := json.Marshal(response)
	if err != nil {
		t.Fatalf("marshal response: %v", err)
	}
	var wire struct {
		Tracks []map[string]any `json:"tracks"`
	}
	if err := json.Unmarshal(raw, &wire); err != nil {
		t.Fatalf("unmarshal response: %v", err)
	}
	if len(wire.Tracks) != len(tests) {
		t.Fatalf("tracks = %d, want %d", len(wire.Tracks), len(tests))
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, present := wire.Tracks[tt.trackIndex]["explicit"]

			if tt.wantExplicit == nil {
				if present {
					t.Fatalf("explicit = %v, want the key omitted", got)
				}
				return
			}
			if !present || got != *tt.wantExplicit {
				t.Errorf("explicit = %v (present %v), want %v", got, present, *tt.wantExplicit)
			}
		})
	}

	if response.Tracks[0].Explicit == nil || !*response.Tracks[0].Explicit {
		t.Errorf("model track 0 explicit = %v, want true", response.Tracks[0].Explicit)
	}
}

func boolPtr(b bool) *bool {
	return &b
}
