package models

type Movie struct {
	ID              string                `json:"id"`
	Title           string                `json:"title"`
	OriginalTitle   string                `json:"original_title"`
	ContentType     string                `json:"type"`
	Description     *string               `json:"description,omitempty"`
	ImageURL        *string               `json:"image_url,omitempty"`
	Tagline         *string               `json:"tagline,omitempty"`
	ImdbID          *string               `json:"imdb_id,omitempty"`
	ReleaseDate     *string               `json:"release_date,omitempty"`
	DurationMinutes *int                  `json:"duration_minutes,omitempty"`
	Status          *string               `json:"status,omitempty"`
	Authors         []Author              `json:"authors,omitempty"`
	Images          *Images               `json:"-"`
	Platforms       map[string][]Platform `json:"-"`
}

type MovieResponse struct {
	ID              string                `json:"id"`
	Type            string                `json:"type"`
	ImdbID          *string               `json:"imdb_id,omitempty"`
	Title           string                `json:"title"`
	OriginalTitle   string                `json:"original_title"`
	Tagline         *string               `json:"tagline,omitempty"`
	Description     *string               `json:"description,omitempty"`
	ImageURL        *string               `json:"image_url,omitempty"`
	ReleaseDate     *string               `json:"release_date,omitempty"`
	Status          *string               `json:"status,omitempty"`
	DurationMinutes *int                  `json:"duration_minutes,omitempty"`
	Authors         []Author              `json:"authors,omitempty"`
	Images          []ImageEntry          `json:"images,omitempty"`
	Platforms       map[string][]Platform `json:"platforms,omitempty"`
}

func (m *Movie) ToResponse() MovieResponse {
	resp := MovieResponse{
		ID:              m.ID,
		Type:            m.ContentType,
		ImdbID:          m.ImdbID,
		Title:           m.Title,
		OriginalTitle:   m.OriginalTitle,
		Tagline:         m.Tagline,
		Description:     m.Description,
		ImageURL:        m.ImageURL,
		ReleaseDate:     m.ReleaseDate,
		Status:          m.Status,
		DurationMinutes: m.DurationMinutes,
		Authors:         m.Authors,
	}

	if m.Images != nil {
		resp.Images = m.Images.ToList(DefaultImagesSize)
	}

	if m.Platforms != nil {
		resp.Platforms = m.Platforms
	}

	return resp
}
