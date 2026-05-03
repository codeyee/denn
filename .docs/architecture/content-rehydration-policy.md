# Content Rehydration Policy

This document defines how persisted content detail freshness is computed
in `core`.

## Current Behavior

- `core` persists per-type detail rows and serves them through the
  local-first read path.
- Freshness no longer depends on static per-type TTLs.
- The canonical policy now lives in
  [`core/content/services/local_content_store/refresh_policy.py`](../../core/content/services/local_content_store/refresh_policy.py).
- The periodic refresh command selects stale rows in SQL via annotated
  `refresh_due_at` expressions derived from the same policy.

## Age Bands

| Band | Condition | Base TTL |
|---|---|---|
| `pre_release` | release date in the future | 1 day |
| `hot` | < 30 days old | 2 days |
| `recent` | < 180 days old | 7 days |
| `first_year` | < 365 days old | 14 days |
| `stable` | < 3 years old | 30 days |
| `aged` | < 10 years old | 90 days |
| `classic` | >= 10 years old | 180 days |
| `unknown` | missing release date | 30 days |

## Type Overrides

- `BOOK` doubles the selected TTL and extends `classic` to 365 days.
- `ALBUM` extends `classic` to 365 days.

Architecture direction:

- Freshness should be derived from `release_date`, not from provider
  `status` vocabularies.
- Any existing status-based override should be treated as transitional
  and removed as `core` converges toward a provider-decoupled domain
  model before the product-heavy sprint line continues.

## Why The Policy Exists

- New releases change quickly enough that stale ratings, cast,
  providers, and metadata become visible product bugs.
- Older catalog items are stable enough that aggressive refresh wastes
  proxy budget and increases operational cost with little user value.
- A dynamic policy improves both accuracy and cost efficiency.

## Read Path

- `detail_is_fresh()` computes the effective policy for the loaded
  detail row and compares `last_refreshed_at` to `policy.ttl`.
- `ensure_content_detail()` remains the orchestration entry point and
  uses the same freshness decision.

## Periodic Refresh Path

- `rehydrate_content_details` annotates each row with `refresh_due_at`
  and selects only rows whose computed due time is in the past.
- Rows are ordered by `refresh_due_at` ascending so the most overdue
  items are refreshed first.
- The command emits:
  - per-item logs with `age_band`, `age_days`, `ttl_days`;
  - per-type summary logs grouped by band.

## Rollout Helper

- `normalize_rehydration_timestamps` reports the current distribution by
  age band.
- With `--apply --stagger-hours=N`, it can spread still-fresh rows
  across a backward time window to avoid a post-switch refresh spike.

## User-Facing Eligibility

The same sprint also tightened what general discovery surfaces can show:

- search, homepage, and preview surfaces exclude items with no usable
  release date;
- they exclude future-dated items outside a 1-day grace window;
- invalid or artificial seasons are filtered out of TV detail payloads.

These rules live in `proxy`, not `core`, so provider ownership remains
unchanged.
