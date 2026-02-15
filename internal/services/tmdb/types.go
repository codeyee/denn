package tmdb

const (
	imageBaseURL = "https://image.tmdb.org/t/p/"

	posterSizeStandard = "w500"
	posterSizeOriginal = "original"

	gallerySizeStandard = "w780"
	gallerySizeOriginal = "original"
)

const (
	ProviderActionStream = "stream"
	ProviderActionRent   = "rent"
	ProviderActionBuy    = "buy"
)

type tmdbSearchResponse struct {
	Page         int                `json:"page"`
	TotalPages   int                `json:"total_pages"`
	TotalResults int                `json:"total_results"`
	Results      []tmdbSearchResult `json:"results"`
}

type tmdbSearchResult struct {
	ID               int     `json:"id"`
	Title            string  `json:"title"`
	Name             string  `json:"name"`
	OriginalTitle    string  `json:"original_title"`
	OriginalName     string  `json:"original_name"`
	Overview         string  `json:"overview"`
	PosterPath       *string `json:"poster_path"`
	BackdropPath     *string `json:"backdrop_path"`
	ReleaseDate      string  `json:"release_date"`
	FirstAirDate     string  `json:"first_air_date"`
	MediaType        string  `json:"media_type"`
	VoteAverage      float64 `json:"vote_average"`
	Popularity       float64 `json:"popularity"`
	OriginalLanguage string  `json:"original_language"`
}

type tmdbMovieDetail struct {
	ID                  int                         `json:"id"`
	Title               string                      `json:"title"`
	OriginalTitle       string                      `json:"original_title"`
	Overview            string                      `json:"overview"`
	Tagline             string                      `json:"tagline"`
	PosterPath          *string                     `json:"poster_path"`
	BackdropPath        *string                     `json:"backdrop_path"`
	ReleaseDate         string                      `json:"release_date"`
	Runtime             *int                        `json:"runtime"`
	Status              string                      `json:"status"`
	ProductionCompanies []tmdbCompany               `json:"production_companies"`
	ExternalIDs         *tmdbExternalIDsResponse    `json:"external_ids,omitempty"`
	WatchProviders      *tmdbWatchProvidersResponse `json:"watch/providers,omitempty"`
	Images              *tmdbImagesResponse         `json:"images,omitempty"`
}

type tmdbTVDetail struct {
	ID                  int                         `json:"id"`
	Name                string                      `json:"name"`
	OriginalName        string                      `json:"original_name"`
	Overview            string                      `json:"overview"`
	Tagline             string                      `json:"tagline"`
	PosterPath          *string                     `json:"poster_path"`
	BackdropPath        *string                     `json:"backdrop_path"`
	FirstAirDate        string                      `json:"first_air_date"`
	Status              string                      `json:"status"`
	NumberOfSeasons     *int                        `json:"number_of_seasons"`
	NumberOfEpisodes    *int                        `json:"number_of_episodes"`
	ProductionCompanies []tmdbCompany               `json:"production_companies"`
	Seasons             []tmdbSeasonSummary         `json:"seasons"`
	ExternalIDs         *tmdbExternalIDsResponse    `json:"external_ids,omitempty"`
	WatchProviders      *tmdbWatchProvidersResponse `json:"watch/providers,omitempty"`
	Images              *tmdbImagesResponse         `json:"images,omitempty"`
}

type tmdbSeasonSummary struct {
	ID           int     `json:"id"`
	SeasonNumber int     `json:"season_number"`
	Name         string  `json:"name"`
	Overview     string  `json:"overview"`
	PosterPath   *string `json:"poster_path"`
	AirDate      string  `json:"air_date"`
	EpisodeCount int     `json:"episode_count"`
}

type tmdbSeasonDetail struct {
	ID           int           `json:"id"`
	SeasonNumber int           `json:"season_number"`
	Name         string        `json:"name"`
	Overview     string        `json:"overview"`
	PosterPath   *string       `json:"poster_path"`
	AirDate      string        `json:"air_date"`
	Episodes     []tmdbEpisode `json:"episodes"`
}

type tmdbEpisode struct {
	ID            int     `json:"id"`
	EpisodeNumber int     `json:"episode_number"`
	SeasonNumber  int     `json:"season_number"`
	Name          string  `json:"name"`
	Overview      string  `json:"overview"`
	AirDate       string  `json:"air_date"`
	Runtime       *int    `json:"runtime"`
	StillPath     *string `json:"still_path"`
	EpisodeType   string  `json:"episode_type"`
}

type tmdbCompany struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type tmdbExternalIDsResponse struct {
	ImdbID *string `json:"imdb_id"`
}

type tmdbWatchProvidersResponse struct {
	Results map[string]tmdbCountryProviders `json:"results"`
}

type tmdbCountryProviders struct {
	Flatrate []tmdbProvider `json:"flatrate"`
	Rent     []tmdbProvider `json:"rent"`
	Buy      []tmdbProvider `json:"buy"`
}

type tmdbProvider struct {
	ProviderID   int    `json:"provider_id"`
	ProviderName string `json:"provider_name"`
	LogoPath     string `json:"logo_path"`
}

type tmdbImagesResponse struct {
	Backdrops []tmdbImage `json:"backdrops"`
	Posters   []tmdbImage `json:"posters"`
}

type tmdbImage struct {
	FilePath string `json:"file_path"`
}
