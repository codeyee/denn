package spotify

type spotifySearchResponse struct {
	Albums spotifyAlbumPage `json:"albums"`
}

type spotifyAlbumPage struct {
	Items  []spotifyAlbum `json:"items"`
	Total  int            `json:"total"`
	Limit  int            `json:"limit"`
	Offset int            `json:"offset"`
}

type spotifyNewReleasesResponse struct {
	Albums spotifyAlbumPage `json:"albums"`
}

type spotifyAlbum struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	AlbumType   string            `json:"album_type"`
	TotalTracks int               `json:"total_tracks"`
	ReleaseDate string            `json:"release_date"`
	Images      []spotifyImage    `json:"images"`
	Artists     []spotifyArtist   `json:"artists"`
	ExternalURLs spotifyExternalURLs `json:"external_urls"`
	Tracks      *spotifyTrackPage `json:"tracks,omitempty"`
}

type spotifyTrackPage struct {
	Items []spotifyTrack `json:"items"`
}

type spotifyTrack struct {
	ID           string              `json:"id"`
	Name         string              `json:"name"`
	TrackNumber  int                 `json:"track_number"`
	DurationMs   int                 `json:"duration_ms"`
	Artists      []spotifyArtist     `json:"artists"`
	ExternalURLs spotifyExternalURLs `json:"external_urls"`
}

type spotifyArtist struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type spotifyImage struct {
	URL    string `json:"url"`
	Height int    `json:"height"`
	Width  int    `json:"width"`
}

type spotifyExternalURLs struct {
	Spotify string `json:"spotify"`
}
