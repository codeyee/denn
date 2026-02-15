package models

type Track struct {
	ID              string   `json:"id"`
	Title           string   `json:"title"`
	TrackNumber     int      `json:"track_number"`
	Authors         []Author `json:"authors,omitempty"`
	DurationSeconds *int     `json:"duration_seconds,omitempty"`
	ExternalURL     *string  `json:"external_url,omitempty"`
}

type Album struct {
	ID              string   `json:"id"`
	Title           string   `json:"title"`
	ContentType     string   `json:"type"`
	Authors         []Author `json:"authors,omitempty"`
	ImageURL        *string  `json:"image_url,omitempty"`
	ReleaseDate     *string  `json:"release_date,omitempty"`
	TotalTracks     *int     `json:"total_tracks,omitempty"`
	DurationMinutes *int     `json:"duration_minutes,omitempty"`
	AlbumType       *string  `json:"album_type,omitempty"`
	ExternalURL     *string  `json:"external_url,omitempty"`
	Images          *Images  `json:"-"`
	Tracks          []Track  `json:"tracks,omitempty"`
}

type AlbumResponse struct {
	ID              string       `json:"id"`
	Type            string       `json:"type"`
	Title           string       `json:"title"`
	ImageURL        *string      `json:"image_url,omitempty"`
	ReleaseDate     *string      `json:"release_date,omitempty"`
	TotalTracks     *int         `json:"total_tracks,omitempty"`
	DurationMinutes *int         `json:"duration_minutes,omitempty"`
	AlbumType       *string      `json:"album_type,omitempty"`
	ExternalURL     *string      `json:"external_url,omitempty"`
	Authors         []Author     `json:"authors,omitempty"`
	Images          []ImageEntry `json:"images,omitempty"`
	Tracks          []Track      `json:"tracks,omitempty"`
}

func (a *Album) ToResponse() AlbumResponse {
	resp := AlbumResponse{
		ID:              a.ID,
		Type:            a.ContentType,
		Title:           a.Title,
		ImageURL:        a.ImageURL,
		ReleaseDate:     a.ReleaseDate,
		TotalTracks:     a.TotalTracks,
		DurationMinutes: a.DurationMinutes,
		AlbumType:       a.AlbumType,
		ExternalURL:     a.ExternalURL,
		Authors:         a.Authors,
		Tracks:          a.Tracks,
	}

	if a.Images != nil {
		resp.Images = a.Images.ToList(DefaultImagesSize)
	}

	return resp
}
