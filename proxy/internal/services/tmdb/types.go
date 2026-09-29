package tmdb

const (
	ImageBaseURL = "https://image.tmdb.org/t/p/"

	PosterSizeStandard = "w500"
	PosterSizeOriginal = "original"

	GallerySizeStandard = "w780"
	GallerySizeOriginal = "original"
)

const (
	ProviderActionStream = "stream"
	ProviderActionRent   = "rent"
	ProviderActionBuy    = "buy"
)

// ReleaseTypeTheatrical is the TMDB release_dates type for a theatrical
// release, the certification we prefer when a country lists several.
const ReleaseTypeTheatrical = 3

type TmdbSearchResponse struct {
	Page         int                `json:"page"`
	TotalPages   int                `json:"total_pages"`
	TotalResults int                `json:"total_results"`
	Results      []TmdbSearchResult `json:"results"`
}

type TmdbSearchResult struct {
	ID               int     `json:"id"`
	Adult            bool    `json:"adult"`
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

type TmdbMovieDetail struct {
	ID                  int                         `json:"id"`
	Adult               *bool                       `json:"adult"`
	Genres              []TmdbGenre                 `json:"genres"`
	Title               string                      `json:"title"`
	OriginalTitle       string                      `json:"original_title"`
	Overview            string                      `json:"overview"`
	Tagline             string                      `json:"tagline"`
	PosterPath          *string                     `json:"poster_path"`
	BackdropPath        *string                     `json:"backdrop_path"`
	ReleaseDate         string                      `json:"release_date"`
	Runtime             *int                        `json:"runtime"`
	Status              string                      `json:"status"`
	ProductionCompanies []TmdbCompany               `json:"production_companies"`
	ExternalIDs         *TmdbExternalIDsResponse    `json:"external_ids,omitempty"`
	WatchProviders      *TmdbWatchProvidersResponse `json:"watch/providers,omitempty"`
	Images              *TmdbImagesResponse         `json:"images,omitempty"`
	Keywords            *TmdbMovieKeywords          `json:"keywords,omitempty"`
	ReleaseDates        *TmdbReleaseDatesResponse   `json:"release_dates,omitempty"`
}

type TmdbTVDetail struct {
	ID                  int                         `json:"id"`
	Adult               *bool                       `json:"adult"`
	Genres              []TmdbGenre                 `json:"genres"`
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
	ProductionCompanies []TmdbCompany               `json:"production_companies"`
	Seasons             []TmdbSeasonSummary         `json:"seasons"`
	ExternalIDs         *TmdbExternalIDsResponse    `json:"external_ids,omitempty"`
	WatchProviders      *TmdbWatchProvidersResponse `json:"watch/providers,omitempty"`
	Images              *TmdbImagesResponse         `json:"images,omitempty"`
	Keywords            *TmdbTVKeywords             `json:"keywords,omitempty"`
	ContentRatings      *TmdbContentRatingsResponse `json:"content_ratings,omitempty"`
}

type TmdbSeasonSummary struct {
	ID           int     `json:"id"`
	SeasonNumber int     `json:"season_number"`
	Name         string  `json:"name"`
	Overview     string  `json:"overview"`
	PosterPath   *string `json:"poster_path"`
	AirDate      string  `json:"air_date"`
	EpisodeCount int     `json:"episode_count"`
}

type TmdbSeasonDetail struct {
	ID           int           `json:"id"`
	SeasonNumber int           `json:"season_number"`
	Name         string        `json:"name"`
	Overview     string        `json:"overview"`
	PosterPath   *string       `json:"poster_path"`
	AirDate      string        `json:"air_date"`
	Episodes     []TmdbEpisode `json:"episodes"`
}

type TmdbEpisode struct {
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

type TmdbGenre struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type TmdbKeyword struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

// TmdbMovieKeywords and TmdbTVKeywords differ only in the list key TMDB uses
// under the appended `keywords` object.
type TmdbMovieKeywords struct {
	Keywords []TmdbKeyword `json:"keywords"`
}

type TmdbTVKeywords struct {
	Results []TmdbKeyword `json:"results"`
}

type TmdbReleaseDatesResponse struct {
	Results []TmdbCountryReleaseDates `json:"results"`
}

type TmdbCountryReleaseDates struct {
	Country      string            `json:"iso_3166_1"`
	ReleaseDates []TmdbReleaseDate `json:"release_dates"`
}

type TmdbReleaseDate struct {
	Certification string `json:"certification"`
	Type          int    `json:"type"`
}

type TmdbContentRatingsResponse struct {
	Results []TmdbContentRating `json:"results"`
}

type TmdbContentRating struct {
	Country string `json:"iso_3166_1"`
	Rating  string `json:"rating"`
}

type TmdbCompany struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type TmdbExternalIDsResponse struct {
	ImdbID *string `json:"imdb_id"`
}

type TmdbWatchProvidersResponse struct {
	Results map[string]TmdbCountryProviders `json:"results"`
}

type TmdbCountryProviders struct {
	Flatrate []TmdbProvider `json:"flatrate"`
	Rent     []TmdbProvider `json:"rent"`
	Buy      []TmdbProvider `json:"buy"`
}

type TmdbProvider struct {
	ProviderID   int    `json:"provider_id"`
	ProviderName string `json:"provider_name"`
	LogoPath     string `json:"logo_path"`
}

type TmdbImagesResponse struct {
	Backdrops []TmdbImage `json:"backdrops"`
	Posters   []TmdbImage `json:"posters"`
}

type TmdbImage struct {
	FilePath string `json:"file_path"`
}
