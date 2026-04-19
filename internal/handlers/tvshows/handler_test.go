package tvshows

import (
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/codeyee/denn-proxy/internal/clients"
	"github.com/codeyee/denn-proxy/internal/providers/tmdb"
	tmdbservice "github.com/codeyee/denn-proxy/internal/services/tmdb/service"
	"github.com/gin-gonic/gin"
)

type RoundTripFunc func(req *http.Request) *http.Response

func (f RoundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req), nil
}

func NewTestClient(fn RoundTripFunc) *http.Client {
	return &http.Client{Transport: fn}
}

func setupTestHandler(client *http.Client) *gin.Engine {
	gin.SetMode(gin.TestMode)
	r := gin.New()

	tmdbClient := tmdb.NewClient("test-key", clients.NoOpCache{}, clients.WithHTTPClient(client))
	service := tmdbservice.NewService(tmdbClient)
	handler := NewHandler(service)

	r.GET("/tv-shows", handler.Search)
	r.GET("/tv-shows/:id", handler.Detail)

	return r
}

func TestSearch(t *testing.T) {
	mockResponse := `{
		"page": 1,
		"total_pages": 1,
		"total_results": 1,
		"results": [
			{"id": 1, "name": "Breaking Bad", "first_air_date": "2008-01-20", "media_type": "tv"}
		]
	}`

	client := NewTestClient(func(req *http.Request) *http.Response {
		if !strings.Contains(req.URL.String(), "/search/tv") {
			return &http.Response{StatusCode: 500, Body: io.NopCloser(strings.NewReader("{}")), Header: make(http.Header)}
		}
		return &http.Response{StatusCode: 200, Body: io.NopCloser(strings.NewReader(mockResponse)), Header: make(http.Header)}
	})

	r := setupTestHandler(client)
	w := httptest.NewRecorder()
	req, _ := http.NewRequest("GET", "/tv-shows?q=test", nil)
	r.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected 200, got %d", w.Code)
	}
}
