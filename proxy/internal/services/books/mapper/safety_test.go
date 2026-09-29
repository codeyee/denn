package mapper

import (
	"encoding/json"
	"fmt"
	"reflect"
	"testing"

	"github.com/codeyee/denn-proxy/internal/services/books"
)

func TestMapBookSubjects(t *testing.T) {
	many := make([]string, 0, 80)
	wantCapped := make([]string, 0, 50)
	for i := 0; i < 80; i++ {
		subject := fmt.Sprintf("Subject %02d", i)
		many = append(many, subject)
		if i < 50 {
			wantCapped = append(wantCapped, subject)
		}
	}
	manyJSON, err := json.Marshal(many)
	if err != nil {
		t.Fatalf("marshal fixture: %v", err)
	}

	tests := []struct {
		name    string
		payload string
		want    []string
	}{
		{
			name:    "search document subject array",
			payload: `{"key": "/works/OL1W", "title": "Book", "subject": ["Fiction", "Erotica"]}`,
			want:    []string{"Fiction", "Erotica"},
		},
		{
			name:    "trims, drops blanks and duplicates, keeps provider order",
			payload: `{"key": "/works/OL2W", "title": "Book", "subject": [" Fiction ", "", "Erotica", "Fiction", "  "]}`,
			want:    []string{"Fiction", "Erotica"},
		},
		{
			name:    "capped at 50 in provider order",
			payload: fmt.Sprintf(`{"key": "/works/OL3W", "title": "Book", "subject": %s}`, manyJSON),
			want:    wantCapped,
		},
		{
			name:    "subject absent",
			payload: `{"key": "/works/OL4W", "title": "Book"}`,
			want:    nil,
		},
		{
			name:    "subject empty",
			payload: `{"key": "/works/OL5W", "title": "Book", "subject": []}`,
			want:    nil,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var doc books.OlDoc
			if err := json.Unmarshal([]byte(tt.payload), &doc); err != nil {
				t.Fatalf("decode fixture: %v", err)
			}

			book := MapBook(doc)

			if !reflect.DeepEqual(book.Subjects, tt.want) {
				t.Errorf("subjects = %#v, want %#v", book.Subjects, tt.want)
			}

			raw, err := json.Marshal(book.ToResponse())
			if err != nil {
				t.Fatalf("marshal response: %v", err)
			}
			var wire map[string]any
			if err := json.Unmarshal(raw, &wire); err != nil {
				t.Fatalf("unmarshal response: %v", err)
			}
			if _, present := wire["subjects"]; present != (tt.want != nil) {
				t.Errorf("subjects key present = %v, want %v", present, tt.want != nil)
			}
		})
	}
}

func TestMapSearchItemIgnoresSubjects(t *testing.T) {
	doc := books.OlDoc{Key: "/works/OL1W", Title: "Book", Subject: []string{"Fiction"}}

	raw, err := json.Marshal(MapSearchItem(doc))
	if err != nil {
		t.Fatalf("marshal item: %v", err)
	}

	var wire map[string]any
	if err := json.Unmarshal(raw, &wire); err != nil {
		t.Fatalf("unmarshal item: %v", err)
	}
	if _, present := wire["subjects"]; present {
		t.Error("search items must not carry subjects")
	}
}
