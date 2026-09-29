package models

// Certification is a country-scoped content rating reported by TMDB
// (release_dates for movies, content_ratings for TV shows).
type Certification struct {
	Country string `json:"country"`
	Rating  string `json:"rating"`
}

// AgeRating is one age-rating organization entry reported by IGDB.
type AgeRating struct {
	Organization string   `json:"organization"`
	Rating       string   `json:"rating"`
	Descriptors  []string `json:"descriptors,omitempty"`
}
