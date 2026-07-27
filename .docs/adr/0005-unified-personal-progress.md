# ADR 0005: Unified Personal Progress

- Status: Accepted
- Date: 2026-07-26

## Context

Denn previously represented a user's relationship with content through
overlapping records:

- `UserContentTracking` stored personal progress and favorites;
- `Rating` stored a score and review;
- `ListItem.status` looked like progress even when the list was personal;
- seasons were redirected to their parent TV show for tracking and rating.

That made one title appear in separate Completed and Ratings collections,
allowed list state to disagree with personal progress, and prevented a season
from having its own progress, rating, review, or favorite.

## Decision

### Canonical personal read model

`UserContentTracking` is the only personal-progress row for a
`(user, content item)` pair. `Rating` remains a one-to-one companion record
for score/review history, joined to tracking transactionally and exposed as one
composed personal read model.

`ListItem.context_status` is separate collaborative context. It is nullable for
personal lists and does not change personal progress. Shared lists may use it
for the list's own pending/completed workflow.

Adding content to a personal list creates `backlog` tracking only when the
owner has no tracking for that content. Existing progress is preserved.
Adding content to a shared list does not create or change personal tracking.

### Type-aware progress policy

The backend owns the supported states and their labels:

| Content type | Supported states |
| --- | --- |
| Movie | backlog, in progress, dropped, completed |
| TV show | backlog, in progress, on hold, dropped, completed |
| Season | backlog, in progress, on hold, dropped, completed |
| Book | backlog, in progress, on hold, dropped, completed |
| Game | backlog, in progress, on hold, dropped, completed |
| Album | backlog, in progress, completed |

The content API serializes this policy so every frontend control renders the
same definition. `completed` is the only final state.

### Rating, review, and favorite invariants

- An active rating or review requires completed tracking.
- Creating or editing a rating atomically creates or moves tracking to
  `completed`.
- Leaving `completed` archives the rating/review and removes the favorite.
  When either effect would occur, the caller must explicitly acknowledge it.
- Returning to `completed` reactivates the preserved rating/review.
- A favorite requires completed tracking and is represented by the tracking
  row, not by a list.
- Deleting tracking archives rating/review history and removes the favorite;
  the same explicit acknowledgement is required when either effect applies.

### Seasons

A persisted season is an independent `ContentItem` for all personal actions.
It retains an explicit `SeasonDetail.tv_show` relation for hierarchy and
navigation, but tracking, rating, review, favorite, and list membership target
the season's own id. Season labels use:

`<series title>: <specific season title>`

When the provider has no specific name, the fallback is
`<series title>: Season <number>`. Inside the parent series view, cards show
only the specific season title or the `Season <number>` fallback.

The TV detail mapper persists the provider's season summaries and associates
them with the local show. A season write never falls back to the parent show.

### Public profile

The public profile has one Progress collection instead of separate Completed
and Ratings tabs. A row is keyed by tracking id/content id and may include its
active rating/review and favorite flag. Filters operate on that composed
collection without duplicating content.

Progress supports both a poster grid and a horizontal list. Grid cards use a
review indicator linked to the content's ratings section instead of placing
review text outside the card. All available indicators share one top-right
group in this order: rating, review, favorite. List rows show the review
excerpt with progress, release, completion, rating, and favorite metadata.

The content ratings section is readable anonymously because it is the target
of links from public profiles. Anonymous collection reads must be scoped to
one content item (or one external source/id pair), return active ratings only,
and expose only the reviewer's id and username. Rating mutations remain
authenticated.

The previous Completed and Ratings endpoints remain temporary compatibility
projections over the same tracking source; new clients use
`GET /api/profiles/<username>/progress/`.

### Migration

The backfill is idempotent and dry-run first. It:

- seeds missing tracking from historical ratings and personal-list completion;
- seeds remaining personal-list membership as `backlog` without overwriting
  existing progress;
- normalizes active ratings to completed tracking;
- clears personal-list contextual state after seeding personal progress;
- preserves shared-list status as contextual state;
- links and persists locally resolvable season parents without rehoming new
  season activity to the TV show;
- reports, rather than guesses, historical season ratings that were already
  merged into a parent and cannot be attributed safely.

## Consequences

- Personal progress has one source of truth and one state selector everywhere.
- Ratings remain separate storage for validation and history, but no longer
  form a competing user-facing collection.
- Shared-list status is explicit and cannot silently overwrite personal state.
- Season content is independently addressable while preserving its parent
  hierarchy.
- Progress changes that would archive or remove user data require a
  confirmation round trip.
