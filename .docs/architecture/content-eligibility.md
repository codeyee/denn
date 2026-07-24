# Discovery Content Eligibility

This document defines the browse/search eligibility boundary.
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
- Spotify Charts is used only to rank album IDs. Because its current
  album payload omits release dates, homepage enriches those IDs through
  Spotify's album endpoint and applies release eligibility to the
  enriched records before writing the aggregate cache.
- A valid chart is cached for 24 hours and retained as a 14-day
  last-known-good fallback. Empty or incompatible chart payloads are
  never promoted into either cache.
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

- Homepage, featured content, previews, and other automatic discovery
  always exclude adult content. A user preference cannot relax those
  surfaces.
- New accounts default `allow_adult_content=false`.
- Direct search accepts the explicit `adult=exclude|include` policy.
  The web derives it from the authenticated profile preference and
  communicates the active behavior next to the results.
- TMDB requests use `include_adult=false` by default. With direct-search
  opt-in they use `include_adult=true`; without opt-in, raw adult results
  are filtered again before mapping so provider/query drift fails closed.
- Provider and aggregate cache keys include the selected adult policy.
  Default and opted-in responses can never share an entry.
- IGDB, Spotify, and OpenLibrary do not expose one equivalent,
  trustworthy cross-provider adult flag in the normalized contracts.
  Denn passes their unclassified results through and never infers adult
  status from titles, descriptions, genres, or keywords. Opt-in therefore
  means “include reliably classified TMDB results,” not a universal
  cross-provider rating system.
- Direct id detail remains an explicit lookup and is not hidden by this
  discovery preference.
- Logs contain the request route/cache status but not the user's
  preference value.

## Verification

- Provider service tests cover release-date eligibility across supported
  media families.
- Spotify provider tests cover chart-view reordering, missing chart
  release dates, malformed entries, and empty-schema failures.
- TMDB tests prove the upstream policy, raw adult filtering, and
  explicit opt-in behavior.
- Homepage and multi-search handler tests prove policy-scoped keys,
  cache hits, stale reads, fail-open cache behavior, and single-flight
  collapse where applicable.
- Core tests prove the safe account default and authenticated opt-in/out
  persistence.
- Production-build browser smoke proves the default search excludes the
  opted-in fixture and that it appears only after the profile control is
  enabled.
