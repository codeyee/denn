# Discovery Content Eligibility

This document defines the Phase 1 browse/search eligibility boundary.
It applies to the public homepage and multi-search surfaces before their
aggregate responses are cached.

## Release Policy

- The reference clock is UTC.
- An item is eligible when its normalized release date is no later than
  `now + 24 hours`.
- Missing, malformed, or provider-zero dates fail closed on general
  discovery surfaces.
- Filtering runs in every provider service used by homepage and search,
  before aggregation and cache writes.
- Aggregate cache keys include the `future-24h` policy version so entries
  from an older policy cannot leak into the current response.

| Provider family | Normalized date | Missing date | Beyond grace window |
|---|---|---|---|
| TMDB movies and TV | release/first-air date | excluded | excluded |
| IGDB games | first release date | excluded | excluded |
| Spotify albums | normalized release date | excluded | excluded |
| OpenLibrary books | first publish date | excluded | excluded |

Direct id detail remains an explicit lookup and is not reclassified as a
discovery browse request.

## Adult-Safety Boundary

- TMDB requests set `include_adult=false`.
- TMDB movie search and popular results are also filtered from the raw
  `adult` field before mapping, so provider/query drift fails closed.
- Aggregate cache keys include the `adult-exclude` policy version.
- IGDB, Spotify, and OpenLibrary do not expose one equivalent,
  trustworthy cross-provider adult flag in the normalized contracts.
  Phase 1 does not infer safety from titles, descriptions, or genres.

The remaining user-preference and provider-classification product design
stays tracked by
[#32](https://github.com/codeyee/denn/issues/32). Phase 1 guarantees the
available TMDB signal and prevents unsafe cache reuse; it does not claim
a universal content-rating system.

## Verification

- Provider service tests cover release-date eligibility across supported
  media families.
- TMDB tests prove both the upstream exclusion parameter and raw adult
  filtering.
- Homepage and multi-search handler tests prove policy-scoped keys,
  cache hits, stale reads, fail-open cache behavior, and single-flight
  collapse where applicable.
