package spotify

type SpotifySearchResponse struct {
	Albums SpotifyAlbumPage `json:"albums"`
}

type SpotifyAlbumPage struct {
	Items  []SpotifyAlbum `json:"items"`
	Total  int            `json:"total"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}

type SpotifyNewReleasesResponse struct {
	Albums SpotifyAlbumPage `json:"albums"`
}

type SpotifyAlbum struct {
	ID           string              `json:"id"`
	Name         string              `json:"name"`
	AlbumType    string              `json:"album_type"`
	TotalTracks  int                 `json:"total_tracks"`
	ReleaseDate  string              `json:"release_date"`
	Images       []SpotifyImage      `json:"images"`
	Artists      []SpotifyArtist     `json:"artists"`
	ExternalURLs SpotifyExternalURLs `json:"external_urls"`
	Tracks       *SpotifyTrackPage   `json:"tracks,omitempty"`
}

type SpotifyTrackPage struct {
	Items []SpotifyTrack `json:"items"`
}

type SpotifyTrack struct {
	ID           string              `json:"id"`
	Name         string              `json:"name"`
	TrackNumber  int                 `json:"track_number"`
	DurationMs   int                 `json:"duration_ms"`
	Artists      []SpotifyArtist     `json:"artists"`
	ExternalURLs SpotifyExternalURLs `json:"external_urls"`
}

type SpotifyArtist struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type SpotifyImage struct {
	URL    string `json:"url"`
	Height int    `json:"height"`
	Width  int    `json:"width"`
}

type SpotifyExternalURLs struct {
	Spotify string `json:"spotify"`
}
