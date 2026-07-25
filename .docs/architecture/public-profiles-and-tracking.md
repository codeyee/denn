# Public Profiles And Personal Tracking

This document is the canonical description of Denn's public identity,
personal tracking, ratings, favorites, and public-list read model.

## Ownership And Sources Of Truth

- `User.username` is the stable public identifier and
  `UserPublicProfile` owns the editable public `bio` and `avatar_url`.
- `UserContentTracking` is the canonical personal state for one
  `(user, content item)` pair. `ListItem.status` remains contextual list
  state and must not be used as personal tracking.
- `Rating` owns score, review text, spoiler state, and whether that
  rating is currently active.
- `UserList.visibility` is independent from `UserList.list_type`.
  `PUBLIC`/`PRIVATE` controls anonymous visibility while
  `PERSONAL`/`SHARED` continues to describe collaboration.
- Public profile and list payloads use only persisted `core` metadata.
  Profile reads never perform per-item calls to `proxy`.

## Public Identity

Every user has a one-to-one `UserPublicProfile`.

- `bio` is plain text with a maximum length of 280 characters.
- `avatar_url` is optional, HTTPS-only, and at most 2,048 characters.
- New usernames are lowercase and limited to letters, numbers, `.`,
  `_`, and `-`.
- Registration rejects exact and case-insensitive collisions.
- Existing usernames remain unchanged so old logins and URLs keep
  working. The backfill reports legacy anomalies instead of renaming
  users.
- Usernames are read-only after registration.

Public serializers never expose email, account preferences, sessions,
private lists, or private memberships. `/api/auth/user/` is a compact
authenticated identity payload; consumers fetch lists, ratings, and
profile data from their dedicated endpoints.

## Tracking State Machine

`UserContentTracking` supports:

- `backlog`
- `in_progress`
- `completed`
- `on_hold`
- `dropped`

All transitions run through `content.services.tracking_service` inside a
database transaction.

- Any state may transition to any other state.
- Rating a title creates or moves tracking to `completed`.
- Manual completion asks for a rating only when there is no active
  rating.
- Leaving `completed` preserves score, review, and favorite data but
  makes the rating publicly inactive.
- Returning to `completed` reactivates the preserved rating.
- Deleting tracking inactivates the historical rating and clears the
  favorite without deleting rating history.
- Global aggregates and all public surfaces include active ratings only.

Tracking records carry `last_completed_at`, `is_favorite`, and
`favorited_at`. Ratings use the existing 0.5–10.0 scale in 0.5 steps,
reviews are plain text capped at 2,000 characters, and `spoiler` is
forced to false when no review exists.

## Favorites And Canonical Content

Favorites are a tracking attribute, separate from rating score.

- A title must be completed before it can become a favorite.
- Each user may preserve at most five favorites per canonical content
  type.
- Temporarily inactive favorites still count toward the quota.
- Quota conflicts return HTTP 409 with
  `FAVORITE_LIMIT_REACHED`.
- A `SEASON` is canonicalized to its persisted parent `TV_SHOW` before
  tracking is written.
- If the local season-parent relationship is missing, the write returns
  a recoverable error and requires the backfill. It never calls
  `proxy` synchronously.

The favorite quota locks the user row before counting and writing. The
concurrency test runs on databases that support `select_for_update`;
SQLite skips that database-specific assertion.

## HTTP Surface

Anonymous reads:

- `GET /api/profiles/<username>/`
- `GET /api/profiles/<username>/completed/`
- `GET /api/profiles/<username>/ratings/`
- `GET /api/profiles/<username>/lists/`
- `GET /api/content/<id>/`
- `GET /api/content/lists/<id>/` for public lists

Authenticated writes:

- `PATCH /api/profiles/me/`
- `PUT /api/content/tracking/<content_id>/`
- `DELETE /api/content/tracking/<content_id>/`
- `PATCH /api/content/tracking/<content_id>/favorite/`

Profile collection endpoints use 24 rows by default and cap
`page_size` at 48. Their supported filters are:

- completed: text, content type, completion date, title, and score;
- ratings: text, content type, review presence, favorite, score range,
  and sort;
- lists: text, owner/member role, creation/update time, and name.

Public profile endpoints are throttled at 120 requests per minute per
IP. A private or nonexistent list returns the same 404 response to an
anonymous outsider. Owners and authorized members still receive the
management serializer for a public list; outsiders receive the
PII-safe public serializer.

The overview is bounded to five favorites per type, four recent
reviews, six recent completions, four public lists, and five banner
images. Public page and overview query paths are protected by
`query_count <= 10` tests and assert zero provider calls.

## Browser And BFF Behavior

The same-origin Core BFF uses a strict public-read predicate:

- only `GET` and `HEAD` are eligible;
- only the public profile, content-detail, and list-detail patterns are
  eligible;
- all mutations and every other Core route require authentication.

When a public read carries an expired cookie, the BFF attempts one
refresh. If refresh cannot restore the session, the request continues
anonymously. A transient refresh failure does not turn a public page
into a login redirect.

Content-detail query keys include `viewerId` or `anonymous`, preventing
personal rating/tracking data from crossing cache scopes. Profile keys
include username, tab, and validated filters. The route loader
prefetches overview and the active tab together and returns the initial
payload explicitly so the first client render matches SSR without a
`HydrationBoundary`.

## Public Profile UI

`/user/$username` is anonymous, shareable, and SSR-rendered. It has
validated search parameters, route metadata and canonical URL, one
`main`, one `h1`, explicit pending/error/404 states, and tabs for
Overview, Completed, Ratings & Reviews, and Lists.

The approved visual direction stays inside the existing Denn system:

- black/plum surfaces and the extracted `BannerShell`;
- responsive favorite artwork collage with a plum fallback;
- the existing content/list cards, vertical lists, rating badge, and
  star control extended through composition;
- direct external avatar loading with `no-referrer` and an initials
  fallback;
- spoiler reviews hidden behind an accessible reveal control;
- keyboard tabs, visible focus, 44px targets, stable geometry, reduced
  motion, and lazy non-banner media.

`/profile` remains the private settings route. It exposes a read-only
username plus bio/avatar editing while preserving the existing account
and preference controls.

## Conservative Backfill

The additive schema migration is followed by:

```bash
python manage.py backfill_public_profiles_tracking --dry-run
python manage.py backfill_public_profiles_tracking --apply
```

The command is transactional and idempotent. It:

- creates missing public profiles;
- links locally resolvable season parents;
- seeds completed tracking from ratings using `created_at`;
- seeds from completed personal-list items using the earliest available
  date;
- never attributes a shared-list completion without the user's own
  rating;
- reports username anomalies and case collisions, content/rating
  duplicates, missing browse metadata, unresolved season parents, and
  omitted shared rows.

Use the operational procedure in
[`../runbooks/public-profile-tracking-backfill.md`](../runbooks/public-profile-tracking-backfill.md).
