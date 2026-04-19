// Package cache exposes the shared cache TTL policy for upstream provider
// responses. Centralizing the values here lets us answer "how stale can
// homepage / search / detail data get?" in one file instead of grepping
// every provider package.
//
// Conventions:
//
//   - Search results are short-lived because user queries are unique and the
//     cost of staleness is low.
//   - Detail / "by id" lookups can live longer; they only change when the
//     underlying entity is edited upstream.
//   - Catalogue surfaces (popular, trending, charts) refresh on TMDB/IGDB's
//     own daily cadence, so a 24h TTL aligns with their refresh schedule.
//   - Static media (images) gets a week — these almost never change.
//
// When adding a new provider call, prefer one of these constants rather
// than introducing a fresh duration; if your call genuinely needs a custom
// TTL, add a named constant here so the policy stays auditable.
package cache

import "time"

const (
	// Search TTLs — keep tight, queries are sparse.
	SearchTTL = 24 * time.Hour
	// BookSearchTTL is shorter because OpenLibrary's search index updates
	// more frequently than TMDB/IGDB.
	BookSearchTTL = 6 * time.Hour

	// Detail TTLs — moderate, individual entity lookups.
	DetailTTL     = 48 * time.Hour
	BookDetailTTL = 12 * time.Hour
	// AlbumDetailTTL is long because Spotify album metadata is effectively
	// immutable once published.
	AlbumDetailTTL = 7 * 24 * time.Hour

	// Catalogue TTLs — daily refresh aligns with upstream cadence.
	CatalogueTTL = 24 * time.Hour

	// MediaTTL covers images/posters that rarely change once uploaded.
	MediaTTL = 7 * 24 * time.Hour
)
