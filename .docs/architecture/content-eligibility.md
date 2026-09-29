# Discovery Content Eligibility

This document defines the browse/search eligibility boundary.
It applies to the public homepage, multi-search, and Browse surfaces before
their aggregate responses are cached.

The moderation behavior below describes code in this repository, not a
production deployment. No production moderation deploy or backfill has been
verified.

## Release Policy

- The reference clock is UTC.
- An item is eligible when its normalized release date is no later than
  `now + 24 hours`.
- Missing, malformed, or provider-zero dates fail closed on general
  discovery surfaces.
- Filtering runs in every provider service used by homepage, search, and Browse,
  before aggregation and cache writes.
- Spotify Charts supplies the popular feed and the bounded recent feed;
  Browse sorts the available chart release dates for `recent`. This is not a
  global new-release catalog and missing dates still fail closed.
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

- Homepage, featured content, previews, Browse, and other automatic discovery
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
  discovery preference. The persisted `allow_adult_content` preference also
  controls explicit detail artwork: missing or false blurs only current
  `complete`/`explicit` artwork; true displays it normally. Anonymous viewers
  use the safe default. A local reveal changes only the current view, not the
  saved preference.
- Logs contain the request route/cache status but not the user's
  preference value.

## Jev Moderation on the Homepage

- Web SSR and the same-origin `/api/proxy/homepage` BFF path share one bulk
  Core identity-resolution step before homepage data feeds the featured banner
  or carousels. The browser does not call Core for individual cards and does
  not receive the proxy API key.
- The homepage is strict: keep an item only when Core's current summary is
  exactly `status=complete` and `classification=safe`. Explicit,
  `needs_review`, `pending`, `stale`, `missing`, `error`, and `complete` with a
  null classification are excluded, as are absent, malformed, and unresolved
  summaries. Ordering of the remaining items is preserved.
- Core resolution is fetched without HTTP caching, but freshness is bounded by
  the existing caches around it: the proxy homepage feed can be 5 minutes fresh
  or up to 30 minutes stale, and the hydrated Web suggestions query uses a
  5-minute React Query `staleTime`. A later judgment change is therefore not
  globally invalidated immediately; the browser can retain hydrated suggestions
  until the query becomes stale and revalidates.
- Core materializes the current moderation-source hash with normalized detail
  writes and compares the latest judgment against it when returning the bulk
  summary. The strict homepage heals itself without operator action, only
  while Core classification is enabled: the bulk resolver enqueues
  metadata-preparation work for items with no normalized detail or with detail
  but no current hash (the preparation worker recomputes the hash and enqueues
  classification), and one queued moderation job for items that have detail and
  a hash but no current judgment. Admission is bulk and deduplicated by job
  identity in any status, so a failed or `outcome_unknown` job is never
  re-queued by a homepage visit. New candidates become eligible within worker
  polling time. The Core metadata-preparation worker and moderation outbox
  worker are implemented as management commands, but no deployed or otherwise
  wired worker process is established by this code change. The bounds are per
  process, not a global provider-call cap; first rollout should use one
  instance of each worker until multi-instance concurrency and persistence
  fencing are validated.
- Homepage filtering happens before the featured banner and carousels are
  selected, so both draw only from currently safe items. A strict homepage can
  be thin while classification catches up. A category with no remaining items
  renders no carousel, and with nothing left to feature the page renders no
  banner and no loading skeleton; the existing empty state still applies when
  every section is empty.
- This homepage discovery rule does not hide direct detail, search, or Browse
  results. Cards and detail pages apply a separate visual-artwork rule (below)
  and use the existing user preference; neither rule implies that a source-code change
  has been deployed. Enable the Web flag only after the workers are running and
  the homepage candidates are classified; see the
  [activation checklist](../runbooks/jev-moderation-workers.md#production-activation-checklist).

## Jev Moderation on Content Cards

- With Web visibility on, content cards blur current `complete`/`explicit`
  artwork unless the viewer has `allow_adult_content=true` (anonymous viewers
  are not opted in). `needs_review`, pending, stale, missing, and malformed
  summaries are not blurred. Search, Browse, lists, profiles, and detail
  remain visible; only the homepage is strict.
- Search and Browse items get their summary from the same bulk Core resolution
  that supplies their ids, only when the flag is on. Core-backed surfaces (list
  detail, public lists, and profile favorites, progress, and reviews, plus the
  homepage in-progress carousel) use the `moderation` object Core already
  returns on content summaries.
- The flag is server-only. The root route resolves it into router context and a
  small provider exposes only that boolean and the viewer's server-resolved
  preference to cards. With the flag off (or no provider), cards never blur.
- Card reveal controls act locally: they do not navigate, do not persist, and
  keep the card's size. Row layouts (list-view rows, profile progress rows,
  review rows) blur without a reveal control; the detail page offers one.
- Not covered: random-pick modal artwork, list and collection cover collages,
  season cards on a show's detail page, and Add-to-list season thumbnails. They
  have no per-image moderation data or are transient; see technical debt.

## Jev Moderation on Content Detail

- Blur detail banner artwork, gallery images, and episode stills only when Core returns the
  exact current summary `status=complete` and `classification=explicit` and the
  viewer is anonymous or has `allow_adult_content=false` (including a missing
  preference value). A true preference displays that artwork normally.
- Missing, pending, stale, error, unknown, malformed, and `needs_review` summaries stay
  visible without blur and retain their stored status. Detail lookup remains
  available; moderation does not block access to the content page.
- The icon-only Eye/EyeOff controls reveal artwork only in the current view.
  They do not write the account preference. SSR and hydration use the same
  session preference, with anonymous/missing values defaulting to blur.
- CSS blur is a presentation affordance, not access control. The underlying
  image URLs and image responses remain accessible.

## Development Moderation Preview

- The Web route `/dev/moderation-preview` presents synthetic examples plus an
  optional read-only Core lookup by one submitted `ContentItem` ID. The lookup
  uses the existing Core client and session; fixture cards make no API requests.
- The production Vite configuration excludes this route from TanStack Start's
  production route graph, and the preview artwork is a source asset imported
  only by the excluded page. The route retains a development-only `notFound()`
  guard as defense in depth. A recorded production build found no preview route
  or artwork in its client/server output; see
  [ADR 0009](../adr/0009-jev-content-moderation.md).
- This preview does not activate moderation enforcement or change production
  discovery, direct-search, or adult-preference behavior.
- Artwork receives a visual blur only for a fresh `complete` judgment with
  `classification=explicit` when the existing `allow_adult_content`
  preference is false, absent, or the viewer is anonymous. True displays it
  normally. Missing, pending, stale, errored, malformed, and `needs_review`
  summaries are not described as safe. The reveal control does not prevent
  access to the underlying image.

See the [moderation product-flow note](../ideas/jev-content-moderation-product-flow.md)
for verified production gaps, the requested outcome, the unratified recommendation,
and decisions that remain open.

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
