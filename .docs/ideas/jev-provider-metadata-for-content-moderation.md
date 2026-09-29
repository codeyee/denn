# Capture Provider Metadata for Jev Content Moderation

**Related:** [Issue #102](https://github.com/codeyee/denn/issues/102)

**Status:** Implemented except the items listed under [Not done](#not-done). Proxy returns the fields below, Core persists them, and question revision `q4` sends them to Jev as contextual text ([ADR 0009](../adr/0009-jev-content-moderation.md)). The provider terms and cost review is still open and must be completed before broad activation.

## Goal

Improve the safety evidence available to Denn's server-side Jev moderation by capturing a small, normalized allowlist of provider metadata. JEV-002-Q3 only made Jev consume text Core already had; `q4` adds this metadata.

## Implemented capture

| Provider | Persisted fields | Use |
| --- | --- | --- |
| TMDB (movies, TV) | `adult`, genres, keywords, certifications (one `{country, rating}` per country, from the detail request's `append_to_response`). | `adult` true is the authoritative override. Genres, keywords, and certifications for US, GB, CA, AU, IE, DE, FR, ES, MX, BR, JP, KR are text for Jev. |
| IGDB (games) | Keywords and age ratings (`organization`, `rating`, `descriptors`) from the current, non-deprecated rating fields. | ESRB `AO` is the authoritative override. Everything else is text for Jev. |
| Spotify (albums) | Per-track `explicit`. | A track-level advisory in the state; never an override, never an album verdict. |
| OpenLibrary (books) | Work `subjects`, at most 50 persisted and 30 sent. | Weak contextual text only. |

Lists are deduplicated and capped when stored (keywords 100, certifications 100, age ratings 20, subjects 50) and again when sent to Jev (keywords 40, subjects 30). A refresh that omits a field clears it. Malformed entries are dropped and never fail a detail write. The remaining sections of this note record the original design constraints.

### Not done

- Provenance and freshness beyond the existing detail refresh: no per-field retrieval time, rating-scheme revision, or explicit stale/unavailable state. Unknown stays unknown because absence never certifies safety.
- Edition-level OpenLibrary provenance; only work subjects are used.
- The terms, quota, and cost review below, including whether provider-derived metadata may be sent to TypeSafe/Jev.
- Measured request volume, latency, and Jev token cost of a catalog-wide rehydration and reclassification under `q4`.
- Re-running the catalog evaluation under `q4` (see the [evaluation runbook](../runbooks/jev-moderation-evaluation.md)).

### Open review checklist

- [ ] TMDB: current terms allow storing and forwarding `adult`, keywords, and certifications to Jev; rate limits and cost of the extended detail request.
- [ ] IGDB: current terms allow storing and forwarding age ratings, descriptors, and keywords; quota impact of the extra fields.
- [ ] Spotify: terms allow persisting and forwarding the per-track `explicit` flag.
- [ ] OpenLibrary: terms allow persisting and forwarding subjects.
- [ ] TypeSafe/Jev: confirm forwarding provider-derived metadata is permitted and record the token cost of the larger state.
- [ ] Measure a bounded rehydration and reclassification, then record volume, latency, and cost before any broad run.

## Candidate capture targets (original analysis)

| Provider | Candidate fields | Safety and interpretation notes |
| --- | --- | --- |
| TMDB | `adult`; region-specific release certifications/ratings; genres; keywords. | A positive `adult` flag remains an authoritative explicit signal. A false or missing flag does not certify safety. Preserve region and rating scheme; do not collapse local certifications into one global value. |
| IGDB | Age-rating entries and descriptors; keywords; themes. | Preserve the rating system and source meaning. Themes are already fetched and persisted in the current path, so Jev can consume them without new ingestion. Age ratings and keywords remain future capture candidates. Missing ratings do not imply safe. |
| Spotify | Per-track `explicit` flag. | Keep the signal at track level. It is not a complete album-level content rating; do not aggregate it into a blanket album verdict. False or missing is not proof of safety. |
| OpenLibrary | Work/edition subject terms. | Subjects are topical metadata, not a maturity rating. Treat them as weak contextual evidence, not an authoritative override; preserve edition/work provenance where available. |

The exact provider fields, endpoint shape, locale behavior, and normalization rules must be verified against current provider documentation before implementation.

## Provenance and freshness

Persist only the normalized fields needed for moderation plus enough provenance to interpret and refresh them:

- Provider and source entity identity, with a field-level source mapping.
- Region, locale, or rating scheme when the value depends on them.
- Retrieval time and provider update/version metadata when supplied.
- A normalization/schema revision and an explicit missing, unavailable, or stale state.

Refresh through the existing provider update path and a bounded cache policy. Do not make an upstream request for each Jev classification. Stale or absent metadata remains unknown; it must not become a safe classification.

## API use, terms, and cost gates

Before implementation, verify each provider's current API contract and Denn's applicable agreement for:

- Endpoint availability, authentication/scopes, rate limits, quotas, and request-cost implications.
- Caching, retention, display, attribution, and derived-data rules.
- Whether selected provider-derived metadata may be sent to the external TypeSafe/Jev service.
- Refresh cadence, incremental request volume, latency, and any paid-tier or usage-budget impact.

Keep provider credentials and direct upstream calls in `proxy`; Core and the browser must use the existing service boundaries. Prefer cached/bulk refresh over per-item fetches. Measure added provider calls, latency, and Jev token usage with representative payloads. Do not assume unlimited caching, zero marginal cost, or permission to transfer all source fields to Jev.

## Acceptance criteria

- A provider-by-provider allowlist documents each captured field, its source meaning, rating region/scheme where applicable, freshness rule, and authoritative versus contextual use.
- Current provider terms, API limits, third-party transfer permission, and cost impact are checked before the implementation is approved.
- Only the bounded normalized allowlist is persisted. The design does not promise to store the full raw provider response.
- Provenance and refresh state let the system distinguish current, stale, missing, and unavailable values without treating unknown as safe.
- Jev receives only selected safety-relevant text and compact rating signals. It does not receive unrelated metadata, external identifiers, URLs, artwork, dates, durations, or a raw payload dump.
- `proxy` remains the sole owner of external provider credentials and calls; metadata failures do not fail content ingestion.
- Offline tests cover mapping, normalization, provenance, region handling, refresh/staleness, missing values, and provider-specific authority rules. Default tests make no live provider or Jev calls.
- The rollout records measured request volume, latency, and Jev token/cost impact before any broad refresh or live evaluation.

## Out of scope

- Sending whole provider payloads to Jev or retaining raw payloads as the moderation contract.
- Treating weak tags, subjects, or absent signals as authoritative proof of safety.
- Adding provider calls to Core or the browser.
- Image, audio, artwork, or lyric moderation.
- Provider ingestion as part of JEV-002-Q3.
