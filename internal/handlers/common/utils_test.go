package common

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestGetCountryFromHeader(t *testing.T) {
	gin.SetMode(gin.TestMode)
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("GET", "/", nil)

	// Test default
	if got := GetCountryFromHeader(c); got != defaultCountry {
		t.Errorf("GetCountryFromHeader() = %v, want %v", got, defaultCountry)
	}

	// Test with header
	c.Request.Header.Set("X-User-Country", "GB")
	if got := GetCountryFromHeader(c); got != "GB" {
		t.Errorf("GetCountryFromHeader() = %v, want %v", got, "GB")
	}
}

func TestParsePagination(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name      string
		query     string
		wantPage  int
		wantLimit int
	}{
		{"default", "", DefaultPage, DefaultLimit},
		{"valid", "?page=2&limit=10", 2, 10},
		{"invalid page", "?page=0", DefaultPage, DefaultLimit},
		{"invalid limit", "?limit=0", DefaultPage, DefaultLimit},
		{"limit too high", "?limit=100", DefaultPage, MaxLimit},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c, _ := gin.CreateTestContext(httptest.NewRecorder())
			c.Request = httptest.NewRequest("GET", "/"+tt.query, nil)

			gotPage, gotLimit := ParsePagination(c)
			if gotPage != tt.wantPage {
				t.Errorf("ParsePagination() page = %v, want %v", gotPage, tt.wantPage)
			}
			if gotLimit != tt.wantLimit {
				t.Errorf("ParsePagination() limit = %v, want %v", gotLimit, tt.wantLimit)
			}
		})
	}
}

func TestParseIDs(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    []int
		wantErr bool
	}{
		{"valid", "1,2,3", []int{1, 2, 3}, false},
		{"single", "1", []int{1}, false},
		{"with spaces", " 1 , 2 ", []int{1, 2}, false},
		{"empty", "", []int{}, false},
		{"invalid", "1,a,3", nil, true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseIDs(tt.input)
			if (err != nil) != tt.wantErr {
				t.Errorf("ParseIDs() error = %v, wantErr %v", err, tt.wantErr)
				return
			}
			if !tt.wantErr && len(got) != len(tt.want) {
				t.Errorf("ParseIDs() = %v, want %v", got, tt.want)
			}
		})
	}
}

func TestParseStringIDs(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  []string
	}{
		{"valid", "a,b,c", []string{"a", "b", "c"}},
		{"single", "a", []string{"a"}},
		{"with spaces", " a , b ", []string{"a", "b"}},
		{"empty", "", []string{}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := ParseStringIDs(tt.input)
			if len(got) != len(tt.want) {
				t.Errorf("ParseStringIDs() = %v, want %v", got, tt.want)
			}
		})
	}
}
