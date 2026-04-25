# Denn MVP Functional Design

Date: 2026-04-20
Status: validated at high level

## Why This Document Exists

This document captures the validated high-level product decisions for
Denn's first serious tracker-first MVP.

It is intentionally functional.
It does not describe implementation details yet.
It defines what the product should do, what product rules are now
settled, and which high-level decisions still remain open before
breaking the work into execution plans.

## Product Shape

Denn's MVP should be built around three distinct but connected layers:

1. `tracking personal`
2. `listas`
3. `superficie publica`

The product should first feel like a serious personal tracker.
After that foundation, it should support personal and collaborative
lists with a public social layer.

## Validated Decisions

### 1. Tracking Is First-Class And Separate From Lists

Tracking is not the same thing as list membership.

The source of truth for a user's relationship with a work should be a
dedicated personal tracking model.
Lists remain editorial and organizational constructs.

This separation is required because:

- a user may have completed a work personally;
- the same work may still be pending in a collaborative group list;
- a work may belong to multiple lists without changing its personal
  tracking state.

### 2. Personal Tracking Statuses For MVP

The MVP personal tracking lifecycle is:

- `backlog`
- `in_progress`
- `completed`
- `on_hold`
- `dropped`

The state machine must allow moving from any state to any other state.

### 3. Backlog Is A System List

Every user should have a built-in `backlog` that behaves like a special
system collection or system list.

It is the quick-save destination for the product.
It should support:

- one-click add from content pages;
- direct completion inside backlog;
- cleaning completed entries.

### 4. Ratings Depend On Completion

Rating is not a free-floating action.
It becomes active when a work is `completed`.

Rules validated for MVP:

- if a user rates from a content page and the item has no prior state,
  that action auto-marks it as `completed`;
- if a work leaves `completed`, its `score`, `favorite`, and `review`
  are preserved but become inactive;
- inactive ratings and reviews do not count for profile, stats, or
  leaderboards until the work returns to `completed`.

### 5. Favorites Are Separate From Score

`favorite` must be separate from the numeric `score`.

Favorites are limited by media type, not globally.
This keeps Denn from biasing one media category against another and
supports future premium expansion cleanly.

### 6. Review Model For MVP

Each user has one canonical `rating/review` per work.

That entry is editable and should retain edit history.
The MVP review payload should include:

- optional text;
- spoiler flag;
- created and updated timestamps.

Users must be allowed to score a work without writing review text.

### 7. Lists: Collaboration And Visibility Are Separate Axes

List collaboration mode and list visibility are independent decisions.

That means the product must support:

- personal public lists;
- personal private lists;
- collaborative private lists;
- collaborative public lists.

In collaborative lists, each member has their own status for each item.
Any future "completed by the group" signal should be derived rather than
stored as the only truth.

### 8. TV Handling For MVP

For MVP personal tracking, TV tracking lives at the `series` level.

Lists may still include both:

- `series`
- `seasons`

This accommodates miniseries, single-season works, and messy upstream
catalog normalization without forcing personal tracking to fragment at
the season level.

### 9. Public Surface Is Required

Public content should be viewable without login.

This applies to:

- public profiles;
- public lists;
- public content pages;
- public leaderboards.

This is both a product and discovery requirement.
Denn should have shareable, indexable public surfaces and should not
behave like an auth-walled catalog app.

### 10. Public Identity

Profiles should use a unique canonical `username` in the public URL.

For the MVP, the username itself can be the visible public identity.
A separate display name can wait.

### 11. Profile Baseline

The profile should be public by default.
Ratings and reviews are public.
Only public lists appear on the public profile.

The MVP rich profile should include:

- short bio;
- basic recap or stats;
- recent reviews;
- favorites by media type;
- public lists;
- a dedicated area for all ratings, with filters and sorting.

### 12. Stats And Recap Scope For MVP

MVP stats should stay intentionally narrow.

The first version only needs simple counters by media type and closely
related basics.
The richer analytical layer can come later.

### 13. Social Scope For MVP

The MVP social layer is public visibility, not social interaction.

There should be no need yet for:

- likes;
- comments on reviews;
- replies;
- follow graph;
- activity feed.

Those remain valid future roadmap items, but not MVP blockers.

### 14. Public Content Pages

The public content page should expose more than metadata.

Its MVP social layer should include:

- average score;
- rating count;
- score distribution;
- recent reviews;
- public lists that include the work.

### 15. Public Leaderboards

The MVP should ship three public leaderboard families:

- `top rated`
- `most loved`
- `most popular`

The initial leaderboard scope is global by media type only.
No advanced filtering is required for the first version.

Ranking should use Bayesian or similarly weighted averages with minimum
vote thresholds.

### 16. Collaborative List Permissions

Collaborative lists use three roles in the MVP:

- `owner`
- `editor`
- `viewer`

This is the minimum permission model that supports real collaboration
without turning every shared list into chaos.

### 17. Public Discovery Baseline

Public search should exist without login, but for the MVP it should
search only `works`.

Public discovery should also include:

- browse pages by media type;
- global public leaderboards by media type;
- direct access to public profiles, public lists, and public content
  pages through URLs and internal linking.

The MVP should not include:

- a public directory of users;
- a public directory of lists;
- mixed search across works, users, and lists.

### 18. Review Editing And Spoilers

Reviews may be edited in the MVP, but edit history should not be
implemented yet.

Spoiler reviews should remain visible publicly but collapsed until the
user explicitly opens them.

### 19. Public Moderation Baseline

The MVP moderation baseline should stay narrow.

Users may report:

- public reviews;
- public lists.

Profiles are public, but profile reporting can wait for a later phase.

### 20. Username Stability

The public `username` should be fixed in the MVP.

That keeps URLs stable, simplifies moderation, and avoids extra account
edge cases during the first serious public release.

### 21. Conservative Migration To Tracking-First

Migration from the current product should be conservative.

At a high level:

- if a work already has a rating, it seeds tracking as `completed`;
- if a work is already marked as completed in current data, it seeds
  tracking as `completed`;
- the migration should not try to infer `backlog`, `in_progress`,
  `on_hold`, or `dropped` from ordinary list membership;
- the built-in system backlog should not be backfilled aggressively from
  old list data.

## Remaining Open Topics

The high-level MVP product definition is now mostly settled.
The main open topics are no longer about product identity, but about
execution detail and rollout strategy.

### 1. Tracking And List Migration Mechanics

The migration principle is decided, but the exact mechanics are not yet
specified:

- whether tracking records are created eagerly or lazily;
- how rating inactivity is represented in storage;
- how collaborative list item states relate to the new tracking source
  of truth.

### 2. Rollout Order Inside The MVP

The product shape is defined, but the implementation still needs a
delivery order.

The biggest release-order question is whether Denn should ship:

- `tracking-first` foundations before public social pages;
- or public content/profile pages first while the tracking model is
  being rebuilt.

### 3. Future-Phase Social Expansion

These are intentionally not MVP blockers, but they remain important for
the longer product arc:

- follow graph;
- simple activity feed;
- likes;
- comments and replies;
- importers from external platforms;
- richer stats and recap;
- advanced leaderboard filtering.
