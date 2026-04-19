package service

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/codeyee/denn-proxy/internal/clients"
	olclient "github.com/codeyee/denn-proxy/internal/providers/openlibrary"
)

type mockRoundTripper struct {
	response *http.Response
	err      error
}

func (m *mockRoundTripper) RoundTrip(req *http.Request) (*http.Response, error) {
	return m.response, m.err
}

func newTestService(mockBody []byte, statusCode int, opts ...clients.ClientOption) *Service {
	mockTransport := &mockRoundTripper{
		response: &http.Response{
			StatusCode: statusCode,
			Body:       io.NopCloser(bytes.NewReader(mockBody)),
			Header:     make(http.Header),
		},
	}

	mockHTTPClient := &http.Client{Transport: mockTransport}
	all := append([]clients.ClientOption{clients.WithHTTPClient(mockHTTPClient)}, opts...)
	client := olclient.NewClient(clients.NoOpCache{}, all...)
	return NewService(client)
}

func TestSearchBooks_Success(t *testing.T) {
	mockResponse := map[string]interface{}{
		"numFound": 150,
		"docs": []map[string]interface{}{
			{
				"key":                "works/OL274505W",
				"title":              "Harry Potter",
				"author_name":        []string{"J.K. Rowling"},
				"cover_i":            12345,
				"first_publish_year": 1997,
				"first_sentence":     []string{"Mr and Mrs Dursley..."},
			},
			{
				"key":                "/works/OL82563W",
				"title":              "The Lord of the Rings",
				"author_name":        []string{"J.R.R. Tolkien"},
				"cover_i":            67890,
				"first_publish_year": 1954,
			},
		},
	}

	mockBody, _ := json.Marshal(mockResponse)
	service := newTestService(mockBody, http.StatusOK)

	result, err := service.SearchBooks(context.Background(), "fantasy", 1, 20)

	if err != nil {
		t.Fatalf("SearchBooks failed: %v", err)
	}

	if len(result.Results) != 2 {
		t.Errorf("expected 2 results, got %d", len(result.Results))
	}

	if result.Results[0].Title != "Harry Potter" {
		t.Errorf("expected title 'Harry Potter', got %s", result.Results[0].Title)
	}

	if result.TotalResults != 150 {
		t.Errorf("expected TotalResults 150, got %d", result.TotalResults)
	}

	if result.Page != 1 {
		t.Errorf("expected Page 1, got %d", result.Page)
	}

	expectedTotalPages := (150 + 20 - 1) / 20
	if result.TotalPages != expectedTotalPages {
		t.Errorf("expected TotalPages %d, got %d", expectedTotalPages, result.TotalPages)
	}
}

func TestSearchBooks_EmptyResults(t *testing.T) {
	mockResponse := map[string]interface{}{
		"numFound": 0,
		"docs":     []interface{}{},
	}

	mockBody, _ := json.Marshal(mockResponse)
	service := newTestService(mockBody, http.StatusOK)

	result, err := service.SearchBooks(context.Background(), "nonexistent", 1, 20)

	if err != nil {
		t.Fatalf("SearchBooks failed: %v", err)
	}

	if len(result.Results) != 0 {
		t.Errorf("expected 0 results, got %d", len(result.Results))
	}

	if result.TotalPages != 0 {
		t.Errorf("expected 0 total pages, got %d", result.TotalPages)
	}
}

func TestSearchBooks_APIError(t *testing.T) {
	// Disable retries: the 5xx is the assertion, not a transient hiccup.
	service := newTestService([]byte(`{}`), http.StatusInternalServerError, clients.WithNoRetry())

	_, err := service.SearchBooks(context.Background(), "test", 1, 20)

	if err == nil {
		t.Error("expected error for API error status")
	}
}

func TestGetBookComplete_Success(t *testing.T) {
	mockResponse := map[string]interface{}{
		"numFound": 1,
		"docs": []map[string]interface{}{
			{
				"key":                    "/works/OL274505W",
				"title":                  "Harry Potter and the Philosopher's Stone",
				"author_name":            []string{"J.K. Rowling"},
				"cover_i":                12345,
				"first_publish_year":     1997,
				"first_sentence":         []string{"Mr and Mrs Dursley..."},
				"number_of_pages_median": 309,
			},
		},
	}

	mockBody, _ := json.Marshal(mockResponse)
	service := newTestService(mockBody, http.StatusOK)

	book, err := service.GetBookComplete(context.Background(), "OL274505W")

	if err != nil {
		t.Fatalf("GetBookComplete failed: %v", err)
	}

	if book.ID != "OL274505W" {
		t.Errorf("expected ID 'OL274505W', got %s", book.ID)
	}

	if book.Title != "Harry Potter and the Philosopher's Stone" {
		t.Errorf("expected title, got %s", book.Title)
	}

	if len(book.Authors) != 1 || book.Authors[0].Name != "J.K. Rowling" {
		t.Errorf("expected author 'J.K. Rowling', got %v", book.Authors)
	}

	if book.Pages == nil || *book.Pages != 309 {
		t.Errorf("expected 309 pages, got %v", book.Pages)
	}

	if book.Images == nil {
		t.Error("expected non-nil Images")
	}
}

func TestGetBookComplete_NotFound(t *testing.T) {
	mockResponse := map[string]interface{}{
		"numFound": 0,
		"docs":     []interface{}{},
	}

	mockBody, _ := json.Marshal(mockResponse)
	service := newTestService(mockBody, http.StatusOK)

	_, err := service.GetBookComplete(context.Background(), "nonexistent")

	if err == nil {
		t.Error("expected error for not found book")
	}
}

func TestGetBookComplete_APIError(t *testing.T) {
	service := newTestService([]byte(`{}`), http.StatusNotFound)

	_, err := service.GetBookComplete(context.Background(), "OL274505W")

	if err == nil {
		t.Error("expected error for API error status")
	}
}

func TestGetTrendingBooks_Success(t *testing.T) {
	docs := make([]map[string]interface{}, 25)
	for i := 0; i < 25; i++ {
		docs[i] = map[string]interface{}{
			"key":                "/works/OL" + string(rune('A'+i)) + "W",
			"title":              "Book " + string(rune('A'+i)),
			"first_publish_year": 2000 + i,
		}
	}

	mockResponse := map[string]interface{}{
		"numFound": 25,
		"docs":     docs,
	}

	mockBody, _ := json.Marshal(mockResponse)
	service := newTestService(mockBody, http.StatusOK)

	result, err := service.GetTrendingBooks(context.Background(), 1, 20)

	if err != nil {
		t.Fatalf("GetTrendingBooks failed: %v", err)
	}

	if len(result.Results) != 20 {
		t.Errorf("expected 20 results (page 1 of 25), got %d", len(result.Results))
	}

	if result.TotalResults != 25 {
		t.Errorf("expected TotalResults 25, got %d", result.TotalResults)
	}

	if result.TotalPages != 2 {
		t.Errorf("expected TotalPages 2, got %d", result.TotalPages)
	}

	if result.Page != 1 {
		t.Errorf("expected Page 1, got %d", result.Page)
	}
}

func TestGetTrendingBooks_Page2(t *testing.T) {
	docs := make([]map[string]interface{}, 25)
	for i := 0; i < 25; i++ {
		docs[i] = map[string]interface{}{
			"key":   "/works/OL" + string(rune('A'+i)) + "W",
			"title": "Book " + string(rune('A'+i)),
		}
	}

	mockResponse := map[string]interface{}{
		"numFound": 25,
		"docs":     docs,
	}

	mockBody, _ := json.Marshal(mockResponse)
	service := newTestService(mockBody, http.StatusOK)

	result, err := service.GetTrendingBooks(context.Background(), 2, 20)

	if err != nil {
		t.Fatalf("GetTrendingBooks failed: %v", err)
	}

	if len(result.Results) != 5 {
		t.Errorf("expected 5 results (page 2 of 25), got %d", len(result.Results))
	}
}

func TestGetTrendingBooks_PageBeyondTotal(t *testing.T) {
	mockResponse := map[string]interface{}{
		"numFound": 5,
		"docs": []map[string]interface{}{
			{"key": "/works/OL1W", "title": "Book 1"},
		},
	}

	mockBody, _ := json.Marshal(mockResponse)
	service := newTestService(mockBody, http.StatusOK)

	result, err := service.GetTrendingBooks(context.Background(), 10, 20)

	if err != nil {
		t.Fatalf("GetTrendingBooks failed: %v", err)
	}

	if len(result.Results) != 0 {
		t.Errorf("expected 0 results for page beyond total, got %d", len(result.Results))
	}
}
