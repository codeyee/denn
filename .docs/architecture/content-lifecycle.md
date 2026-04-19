# Content Lifecycle

This document records how content metadata enters, lives in, and is
refreshed inside the system today.

## Identity And Routing

- Public content routes are internal-id first: `/content/[id]`.
- `core` owns the `ContentItem` identity.
- The ingest endpoint in current code is
  `POST /api/content/get-or-create/`.
- The legacy external triple route still exists only as a compatibility
  shim toward the internal id route.

## Ownership

- `proxy` owns provider credentials and raw upstream access.
- `core` owns all persisted metadata in PostgreSQL.
- `web` should navigate using the internal content id once it has one.

## Persisted Model

- `ContentItem` is the stable cross-type identity.
- Per-type detail tables exist for:
  - movie
  - tv show
  - season
  - album
  - game
  - book
- Supporting child and catalog tables exist for episodes, tracks,
  images, platforms, authors, genres, themes, and game modes.
- `ContentItemBrowseMetadata` is a derived read model used for list
  exploration, sorting, and grouping.

## Read Path

The canonical `source_data` read path is local-first:

1. Load `ContentItem` plus related detail rows.
2. If the local detail is fresh, reconstruct the proxy-shaped payload
   from PostgreSQL.
3. If the local detail is stale or missing, call `proxy`.
4. If proxy refresh succeeds, persist the refreshed detail and rebuild
   the payload locally.
5. If proxy refresh fails but stale local data exists, return the local
   payload with `is_stale=true`.

Primary implementation:

- [`../../core/content/services/source_data_orchestrator.py`](../../core/content/services/source_data_orchestrator.py)
- [`../../core/content/services/local_content_store/__init__.py`](../../core/content/services/local_content_store/__init__.py)

## Refresh Path

- First-time population can be backfilled with
  `backfill_content_details`.
- Periodic refresh uses `rehydrate_content_details`.
- Freshness is currently determined by static per-type TTLs in
  `CONTENT_REHYDRATION_TTL`.
- Dynamic age-based refresh policy is planned but not implemented.

Operational runbook:
[`../runbooks/rehydrate-content.md`](../runbooks/rehydrate-content.md)

## Browse Metadata

- `browse_metadata` is kept in sync during local detail writes.
- It is already used by the list query model for grouping, sorting, and
  stable exploration.
- There is still room to improve refresh policy and stale handling for
  browse metadata as a separate read model.

## Current Constraints

- `proxy` does not write to PostgreSQL.
- `core` remains the only writer of content persistence.
- Freshness policy is static, so newly released content may stay stale
  longer than ideal.
- The system still depends on proxy availability for missing or stale
  items that have no usable local fallback.

## Open Work

- Dynamic rehydration policy by age and type remains planned; detailed execution notes live under `.docs/sprints/`.
- Remaining auth/session alignment for protected content routes:
  [`./auth-session-bootstrap.md`](./auth-session-bootstrap.md)
