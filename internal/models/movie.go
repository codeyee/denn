package models

type Movie struct {
	ID              string                `json:"id"`
	Title           string                `json:"title"`
	OriginalTitle   string                `json:"original_title"`
	ContentType     string                `json:"type"`
	Description     *string               `json:"description"`
	ImageURL        *string               `json:"image_url"`
	Tagline         *string               `json:"tagline"`
	ImdbID          *string               `json:"imdb_id"`
	ReleaseDate     *string               `json:"release_date"`
	DurationMinutes *int                  `json:"duration_minutes"`
	Status          *string               `json:"status"`
	Authors         []Author              `json:"authors,omitempty"`
	Images          *Images               `json:"-"`
	Platforms       map[string][]Platform `json:"-"`
}

type MovieResponse struct {
	ID              string                `json:"id"`
	Type            string                `json:"type"`
	ImdbID          *string               `json:"imdb_id"`
	Title           string                `json:"title"`
	OriginalTitle   string                `json:"original_title"`
	Tagline         *string               `json:"tagline"`
	Description     *string               `json:"description"`
	ImageURL        *string               `json:"image_url"`
	ReleaseDate     *string               `json:"release_date"`
	Status          *string               `json:"status"`
	DurationMinutes *int                  `json:"duration_minutes"`
	Authors         []Author              `json:"authors,omitempty"`
	Images          []ImageEntry          `json:"images,omitempty"`
	Platforms       map[string][]Platform `json:"platforms,omitempty"`
}

func (m *Movie) ToResponse(imagesSize int) MovieResponse {
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
		resp.Images = m.Images.ToList(imagesSize)
	}

	if m.Platforms != nil {
		resp.Platforms = m.Platforms
	}

	return resp
}
