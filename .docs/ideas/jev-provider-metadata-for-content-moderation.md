# Capture Provider Metadata for Jev Content Moderation

**Related:** [Issue #102](https://github.com/codeyee/denn/issues/102)

**Status:** Future backlog; separate from JEV-002-Q3. This document is not authorization to ingest provider data.

## Goal

Improve the safety evidence available to Denn's server-side Jev moderation by capturing a small, normalized allowlist of provider metadata that is not currently persisted. Keep this separate from JEV-002-Q3, which only makes Jev consume relevant text already available through Core.

## Candidate capture targets

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
