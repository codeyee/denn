package common

import (
	"reflect"
	"testing"
)

func TestUniqueTrimmed(t *testing.T) {
	tests := []struct {
		name string
		in   []string
		want []string
	}{
		{name: "nil input", in: nil, want: nil},
		{name: "empty input", in: []string{}, want: nil},
		{name: "only blanks", in: []string{"", "  ", "\t"}, want: nil},
		{name: "trims and keeps provider order", in: []string{" Drama ", "Romance"}, want: []string{"Drama", "Romance"}},
		{name: "drops duplicates after trimming", in: []string{"Drama", " Drama", "Romance", "Drama "}, want: []string{"Drama", "Romance"}},
		{name: "dedupe is case sensitive", in: []string{"sex", "Sex"}, want: []string{"sex", "Sex"}},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := UniqueTrimmed(tt.in); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("UniqueTrimmed(%q) = %#v, want %#v", tt.in, got, tt.want)
			}
		})
	}
}
