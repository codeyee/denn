# Public Profiles And Personal Tracking

This document is the canonical description of Denn's public identity,
personal tracking, ratings, favorites, and public-list read model.

## Ownership And Sources Of Truth

- `User.username` is the stable public identifier and
  `UserPublicProfile` owns the editable public `bio`, `avatar_url`, and
  optional banner selection.
- `UserContentTracking` is the canonical personal state for one
  `(user, content item)` pair. `ListItem.context_status` is nullable,
  shared-list context and must not be used as personal tracking.
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
- A banner selection stores a completed active favorite and, optionally, one
  of that content item's persisted gallery or poster images. The backend
  validates both references against the current user and favorite state.
  Clearing the selection restores the random favorite fallback.

Public serializers never expose email, account preferences, sessions,
private lists, or private memberships. `/api/auth/user/` is a compact
authenticated identity payload; consumers fetch lists, ratings, and
profile data from their dedicated endpoints.

## Tracking State Machine

`UserContentTracking` uses one backend-owned, type-aware policy:

- movie: `backlog`, `in_progress`, `dropped`, `completed`;
- TV show, season, book, and game: `backlog`, `in_progress`, `on_hold`,
  `dropped`, `completed`;
- album: `backlog`, `in_progress`, `completed`.

The content API serializes the supported values and labels. Every selector in
content detail, personal lists, and shared lists consumes that policy instead
of defining another frontend state map.

All transitions run through `content.services.tracking_service` inside a
database transaction.

- Adding content to a personal list creates `backlog` tracking when none
  exists and preserves any existing state. Shared-list additions do not
  change personal tracking.
- Any supported state may transition to any other supported state for that
  content type.
- Rating a title creates or moves tracking to `completed`.
- Manual completion asks for a rating only when there is no active
  rating.
- Leaving `completed` archives the preserved rating/review and removes the
  favorite. If either effect applies, the API first returns a conflict that
  lists the effects and requires explicit acknowledgement.
- Returning to `completed` reactivates the preserved rating.
- Deleting tracking first reports any rating/review archive or favorite
  removal, requires explicit acknowledgement, then inactivates the historical
  rating and clears the favorite without deleting rating history.
- Global aggregates and all public surfaces include active ratings only.

Tracking records carry `last_completed_at`, `is_favorite`, and
`favorited_at`. Ratings use the existing 0.5–10.0 scale in 0.5 steps,
reviews are plain text capped at 2,000 characters, and `spoiler` is
forced to false when no review exists.

## Favorites And Canonical Content

Favorites are a tracking attribute, separate from rating score.

- A title must be completed before it can become a favorite.
- Each user may preserve at most five active favorites per content
  type.
- Quota conflicts return HTTP 409 with
  `FAVORITE_LIMIT_REACHED`.
- A `SEASON` targets its own persisted `ContentItem`. Its
  `SeasonDetail.tv_show` relation supplies hierarchy and navigation, not state
  redirection.

The favorite quota locks the user row before counting and writing. The
concurrency test runs on databases that support `select_for_update`;
SQLite skips that database-specific assertion.

## HTTP Surface

Anonymous reads:

- `GET /api/profiles/<username>/`
- `GET /api/profiles/<username>/progress/`
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

Profile collection endpoints use 24 rows by default and cap `page_size` at 48.
New clients use the unified Progress endpoint. Its supported filters are text,
multiple progress statuses, multiple content types, series/season subtype,
rating presence, review presence, favorite, score range, and sort. `type` and
`status` accept comma-separated values. Sorting separates the criterion
(`updated`, `completed`, `title`, or `score`) from `order=asc|desc`. The older
Completed and Ratings endpoints are compatibility projections over the same
tracking source.

The lists collection supports text, owner/member role, creation/update time,
and name.

Public profile endpoints are throttled at 120 requests per minute per
IP. A private or nonexistent list returns the same 404 response to an
anonymous outsider. Owners and authorized members still receive the
management serializer for a public list; outsiders receive the
PII-safe public serializer.

The overview is bounded to five favorites per type, four recent
reviews, six recent completions, four public lists, and five random fallback
banner candidates. It also exposes the selected banner and bounded image
options for each favorite so the owner can choose a specific gallery or
poster image. Public page and overview query paths are protected by
`query_count <= 10` tests and assert zero provider calls.

The frontend combines the bounded favorite groups into one collection,
sorts scored items from highest to lowest with favorite date and title
as stable tie-breakers, and exposes multi-select type filters. With no
active type filters, every favorite is visible in the same grid.

Local content summaries include ordered authors and distinguish poster
art from gallery art. Profile cards show at most the first two authors
and collapse the remainder into the shared `& N more` treatment. Banner
candidates prefer the highest-quality gallery art and fall back to the
highest-quality poster with contained artwork treatment, so poster-only
albums and books still render a usable profile banner.

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
include username, tab, and validated filters. On initial entry, the route
loader prefetches overview and the active tab together and returns the payload
explicitly so the first client render matches SSR without a
`HydrationBoundary`. Search-parameter changes remain client-side: the mounted
profile stays visible and TanStack Query preserves the previous result while
the next filtered page is fetched.

## Public Profile UI

`/user/$username` is anonymous, shareable, and SSR-rendered. It has
validated search parameters, route metadata and canonical URL, one
`main`, one `h1`, explicit pending/error/404 states, and tabs for Overview,
Progress, and Lists. Progress renders each tracked content item once and
composes status, rating/review, and favorite metadata into that row.
It offers a poster grid and a horizontal review-style list over the same
paginated result and cache key. The selected view stays in the URL but is not
sent to Core as a data filter. Content types and progress statuses are
independent multi-select chip groups. Sort criterion and direction are
independent controls, and secondary categorical filters use
keyboard-accessible icon menus.

The approved visual direction stays inside the existing Denn system:

- black/plum surfaces and the extracted `BannerShell`;
- responsive favorite artwork with a plum fallback; gallery art fills the
  banner while poster-only art uses a blurred ambient copy and a centered
  contained foreground;
- the existing content/list cards, vertical lists, rating badge, and
  star control extended through composition;
- direct external avatar loading with `no-referrer` and an initials
  fallback;
- spoiler reviews hidden behind an accessible reveal control;
- compact review indicators that navigate to the public, content-scoped
  ratings section without exposing private account fields;
- keyboard tabs, visible focus, 44px targets, stable geometry, reduced
  motion, and lazy non-banner media.

For an authenticated user, the navbar avatar links directly to
`/user/<username>`. Owners see their immutable username and edit their
bio/avatar/banner in a modal on that public page; a successful mutation
updates the visible profile and navbar identity before revalidation. When a
favorite is removed, its banner selection is cleared in the tracking
transaction and the profile returns to the random fallback.
Private account preferences and session actions live at `/settings`.
`/profile` is not an application route.

## Conservative Backfill

The additive schema migration is followed by:

```bash
python manage.py backfill_public_profiles_tracking --dry-run
python manage.py backfill_public_profiles_tracking --apply
```

The command is transactional and idempotent. It:

- creates missing public profiles;
- links locally resolvable season parents;
- seeds completed tracking from ratings using `created_at` and normalizes
  active-rating invariants;
- seeds from completed personal-list items using the earliest available
  date;
- seeds all other personal-list membership as `backlog` without overwriting
  existing tracking;
- clears contextual state from personal-list rows after progress is seeded;
- preserves shared-list state as contextual state;
- never attributes a shared-list completion without the user's own
  rating;
- never rehomes new season state to a TV show;
- reports username anomalies and case collisions, content/rating duplicates,
  missing browse metadata, unresolved season parents, historical
  season-to-parent attribution ambiguity, and omitted shared rows.

Use the operational procedure in
[`../runbooks/public-profile-tracking-backfill.md`](../runbooks/public-profile-tracking-backfill.md).

The structural decision is recorded in
[`../adr/0005-unified-personal-progress.md`](../adr/0005-unified-personal-progress.md).
