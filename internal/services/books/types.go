package books

type olSearchResponse struct {
	NumFound int     `json:"numFound"`
	Docs     []olDoc `json:"docs"`
}

type olDoc struct {
	Key              string   `json:"key"`
	Title            string   `json:"title"`
	AuthorName       []string `json:"author_name"`
	CoverI           *int     `json:"cover_i"`
	FirstPublishYear *int     `json:"first_publish_year"`
	PublishDate      []string `json:"publish_date"`
	FirstSentence    []string `json:"first_sentence"`
	NumberOfPages    *int     `json:"number_of_pages_median"`
}
