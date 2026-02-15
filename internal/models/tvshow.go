package models

type Episode struct {
	ID              string  `json:"id"`
	EpisodeNumber   int     `json:"episode_number"`
	SeasonNumber    int     `json:"season_number"`
	Title           string  `json:"title"`
	Description     *string `json:"description,omitempty"`
	ReleaseDate     *string `json:"release_date,omitempty"`
	DurationMinutes *int    `json:"duration_minutes,omitempty"`
	ImageURL        *string `json:"image_url,omitempty"`
	EpisodeType     *string `json:"episode_type,omitempty"`
}

type Season struct {
	ID               string                `json:"id"`
	SeasonNumber     int                   `json:"season_number"`
	Title            string                `json:"title"`
	ContentType      string                `json:"type"`
	NumberOfEpisodes int                   `json:"number_of_episodes"`
	Description      *string               `json:"description,omitempty"`
	ReleaseDate      *string               `json:"release_date,omitempty"`
	ImageURL         *string               `json:"image_url,omitempty"`
	TVShowName       *string               `json:"tv_show_name,omitempty"`
	Images           *Images               `json:"-"`
	Episodes         []Episode             `json:"-"`
	Platforms        map[string][]Platform `json:"-"`
}

type SeasonResponse struct {
	ID               string                `json:"id"`
	Type             string                `json:"type"`
	SeasonNumber     int                   `json:"season_number"`
	Title            string                `json:"title"`
	TVShowName       *string               `json:"tv_show_name,omitempty"`
	Description      *string               `json:"description,omitempty"`
	ImageURL         *string               `json:"image_url,omitempty"`
	ReleaseDate      *string               `json:"release_date,omitempty"`
	NumberOfEpisodes int                   `json:"number_of_episodes"`
	Images           []ImageEntry          `json:"images,omitempty"`
	Platforms        map[string][]Platform `json:"platforms,omitempty"`
	Episodes         []Episode             `json:"episodes,omitempty"`
}

func (s *Season) ToResponse(imagesSize int) SeasonResponse {
	resp := SeasonResponse{
		ID:               s.ID,
		Type:             s.ContentType,
		SeasonNumber:     s.SeasonNumber,
		Title:            s.Title,
		TVShowName:       s.TVShowName,
		Description:      s.Description,
		ImageURL:         s.ImageURL,
		ReleaseDate:      s.ReleaseDate,
		NumberOfEpisodes: s.NumberOfEpisodes,
		Episodes:         s.Episodes,
	}

	if s.Images != nil {
		resp.Images = s.Images.ToList(imagesSize)
	}

	if s.Platforms != nil {
		resp.Platforms = s.Platforms
	}

	return resp
}

type TVShow struct {
	ID               string                `json:"id"`
	Title            string                `json:"title"`
	OriginalTitle    string                `json:"original_title"`
	ContentType      string                `json:"type"`
	Description      *string               `json:"description,omitempty"`
	ImageURL         *string               `json:"image_url,omitempty"`
	Tagline          *string               `json:"tagline,omitempty"`
	ImdbID           *string               `json:"imdb_id,omitempty"`
	ReleaseDate      *string               `json:"release_date,omitempty"`
	Status           *string               `json:"status,omitempty"`
	NumberOfSeasons  *int                  `json:"number_of_seasons,omitempty"`
	NumberOfEpisodes *int                  `json:"number_of_episodes,omitempty"`
	Authors          []Author              `json:"authors,omitempty"`
	Images           *Images               `json:"-"`
	Platforms        map[string][]Platform `json:"-"`
	Seasons          []Season              `json:"-"`
}

type TVShowResponse struct {
	ID               string                `json:"id"`
	Type             string                `json:"type"`
	ImdbID           *string               `json:"imdb_id,omitempty"`
	Title            string                `json:"title"`
	OriginalTitle    string                `json:"original_title"`
	Tagline          *string               `json:"tagline,omitempty"`
	Description      *string               `json:"description,omitempty"`
	ImageURL         *string               `json:"image_url,omitempty"`
	ReleaseDate      *string               `json:"release_date,omitempty"`
	Status           *string               `json:"status,omitempty"`
	NumberOfSeasons  *int                  `json:"number_of_seasons,omitempty"`
	NumberOfEpisodes *int                  `json:"number_of_episodes,omitempty"`
	Authors          []Author              `json:"authors,omitempty"`
	Images           []ImageEntry          `json:"images,omitempty"`
	Platforms        map[string][]Platform `json:"platforms,omitempty"`
	Seasons          []SeasonResponse      `json:"seasons,omitempty"`
}

func (tv *TVShow) ToResponse(imagesSize int) TVShowResponse {
	resp := TVShowResponse{
		ID:               tv.ID,
		Type:             tv.ContentType,
		ImdbID:           tv.ImdbID,
		Title:            tv.Title,
		OriginalTitle:    tv.OriginalTitle,
		Tagline:          tv.Tagline,
		Description:      tv.Description,
		ImageURL:         tv.ImageURL,
		ReleaseDate:      tv.ReleaseDate,
		Status:           tv.Status,
		NumberOfSeasons:  tv.NumberOfSeasons,
		NumberOfEpisodes: tv.NumberOfEpisodes,
		Authors:          tv.Authors,
	}

	if tv.Images != nil {
		resp.Images = tv.Images.ToList(imagesSize)
	}

	if tv.Platforms != nil {
		resp.Platforms = tv.Platforms
	}

	if len(tv.Seasons) > 0 {
		resp.Seasons = make([]SeasonResponse, len(tv.Seasons))

		for i, season := range tv.Seasons {
			resp.Seasons[i] = season.ToResponse(imagesSize)
		}
	}

	return resp
}
