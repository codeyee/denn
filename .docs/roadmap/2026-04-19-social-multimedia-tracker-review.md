# Functional Product Review: Denn As A Social Multi-Media Tracker

Date: 2026-04-19

Technical note:

- This review remains useful as product analysis.
- It was written before the TanStack Start migration settled fully, so
  when concrete file paths differ, trust
  `architecture/current-state.md`, active sprint docs, and `AGENTS.md`.

## Why This Document Exists

This review translates the current codebase into product reality.
It is intentionally functional and blunt:

- what Denn actually does today;
- what it does well;
- what is overstated, shallow, or unfinished;
- what is missing if the target is a social multi-media tracker in the
  family of Letterboxd or RateYourMusic;
- what roadmap makes sense without exploding scope.

This document is grounded in the current repo, especially:

- `web/src/routes/index.tsx`
- `web/src/routes/search.tsx`
- `web/src/routes/content/$id.tsx`
- `web/src/routes/lists/$id.tsx`
- `web/src/routes/profile.tsx`
- `web/src/components/pages/HomePage/`
- `core/content/models/user_list.py`
- `core/content/models/list_item.py`
- `core/content/models/rating.py`
- `core/authentication/serializers/profile.py`

## Functional Truth Today

Denn today is a serious multi-source catalog and list application with
user auth, ratings, and collaborative lists.

Functionally, the shipped experience is:

- register, login, logout;
- browse a personalized home after login;
- search movies, TV shows, games, albums, and books;
- open detail pages for persisted content items using an internal Denn
  id;
- add items to lists;
- create personal lists and shared lists;
- invite other users into shared lists;
- reorder, filter, sort, and group list items;
- mark list items as `PENDING` or `COMPLETED`;
- rate an item from 0.5 to 10 and optionally leave a short comment;
- read other users' ratings for a content item;
- see provider/platform metadata for some media types;
- persist normalized content detail locally instead of depending on
  external APIs for every read.

The brutally honest summary is this:

Denn is currently much closer to a technically strong collaborative
catalog/list app than to a complete social tracker product.

It already has meaningful foundations.
It does not yet have the product loops that make Letterboxd, RYM,
Backloggd, Goodreads, or Trakt sticky as social products.

## What Is Already Good

### 1. The product has a real core, not just a UI shell

This is not a fake demo app.
There is real domain modeling for:

- canonical content identity;
- typed detail storage per media family;
- ratings;
- shared list membership and invitations;
- browse metadata for list exploration;
- local-first content reads.

That matters because many early social-tracker projects never get past
"search external API and show cards". Denn is already beyond that.

### 2. The multi-media ambition is credible at the metadata layer

The app genuinely supports:

- movies;
- TV shows and seasons;
- games;
- albums;
- books.

That cross-media scope is already visible in search, detail pages, and
content persistence. The proxy/service split is well thought through and
makes the ambition technically sustainable.

### 3. Shared lists are the strongest differentiated feature today

The list system is not trivial:

- personal vs shared list types;
- invitations;
- members;
- canonical ordering;
- reorder mode;
- apply-sort-as-canonical-order;
- grouping, filtering, range filters, and multi-field sort.

For a small product, that is unusually strong.
If Denn had to win on one feature today, it would be collaborative
curation through lists.

### 4. The architecture is better than the current product maturity

The `web` / `core` / `proxy` split, local-first detail reconstruction,
request correlation, and explicit contracts are stronger than what the
current user-facing product fully exploits.

That is good news:
the project is not blocked by a broken foundation.
Most missing product value is now a prioritization and UX problem, not a
"rewrite the stack" problem.

## What Is Weak Or Misleading Right Now

### 1. The public product story is ahead of the real product

The landing page currently promises:

- "Social Features";
- "Track Progress";
- "Stay Organized";
- "Rate & Review".

That messaging overstates the current experience.

What exists in code is:

- collaborative lists;
- ratings with optional comments;
- no follow graph;
- no public-facing community layer;
- no real activity feed;
- no stats dashboard;
- no first-class watchlist/backlog/wishlist system;
- no diary/log model.

This creates a trust problem.
The product says "social tracker" but behaves like an auth-gated private
catalog app with shared lists.

### 2. Everything important is locked behind auth

Current major routes are protected:

- `/content/<id>`
- `/lists/<id>`
- `/profile`
- legacy content redirect path

Search is also effectively auth-gated in the route shell.

This is a major product limitation.
Letterboxd- and RYM-like products grow through public discovery:

- searchable public profiles;
- public list pages;
- shareable item pages with community activity;
- indexable pages that can be linked freely.

Denn currently has almost no public product surface beyond the landing
page.

### 3. The tracking model is too shallow

`ListItem.Status` only supports:

- `PENDING`
- `COMPLETED`

That is too primitive for a multi-media tracker.

It cannot express:

- watching / watched;
- playing / played;
- reading / read;
- paused;
- dropped;
- on hold;
- plan to watch / play / read;
- rewatch / replay / reread counts;
- completion date history;
- diary entries per session or per completion.

Right now, tracking is piggybacking on lists instead of existing as a
first-class product model.

### 4. Ratings are not the same as reviews

The app has a `Rating` model with:

- score;
- optional comment;
- one rating per user per content item.

That is useful, but it is still not a review system.
There is no separate concept of:

- long-form review;
- spoiler flag;
- review comments;
- likes/helpfulness;
- edits/history;
- pinned or featured reviews;
- sorting reviews by relevance, recency, or network proximity.

So "rate and review" is only half true today.

### 5. Profile exists technically, but not as a product feature

Backend profile serialization already exposes:

- user info;
- lists;
- ratings;
- `lists_count`;
- `ratings_count`.

But the current `/profile` page only renders:

- username;
- email;
- user id;
- logout button.

This is a glaring product mismatch.
The domain can already support a richer profile than the UI exposes.

### 6. Social means collaboration today, not discovery

The only meaningful social primitive shipped is shared lists.
That is valid, but narrow.

Missing are the features that make taste visible and networked:

- follow users;
- see what friends logged/rated;
- compare taste;
- see trending inside your network;
- browse public profiles and public lists;
- react to other users' writing.

Without those, the app is collaborative, not social.

## What Is Missing If Denn Wants To Be A Real Social Tracker

These are not "nice to have". They are the minimum product gaps between
Denn and the category it wants to inhabit.

### Must-have missing capability 1: first-class tracking lifecycle

Denn needs a user-owned tracking model that is not the same as list
membership.

Required:

- a single canonical per-user tracking record per item;
- media-aware statuses;
- start date / finish date;
- rewatch / replay / reread count;
- optional notes;
- ability to log multiple entries over time.

Without this, the app remains "lists plus ratings", not a tracker.

### Must-have missing capability 2: public social surface

Denn needs public-facing entities:

- public user profiles;
- public lists;
- public content pages;
- stable public sharing model.

Today the domain only distinguishes personal vs shared lists, which is
useful for collaboration but still not the same as public publishing and
discovery.

At minimum, users must be able to share their taste without requiring
the recipient to authenticate first.

### Must-have missing capability 3: social graph and activity feed

If the word "social" remains part of the product promise, the app needs:

- follow / follower relationships;
- a home feed;
- activity cards for ratings, logs, list updates, and reviews;
- lightweight notification signals.

Otherwise the social promise should be removed from the positioning.

### Must-have missing capability 4: real profile identity

A useful profile needs:

- avatar;
- bio;
- favorite media snapshot or pinned lists;
- rating distribution;
- activity history;
- public stats;
- recent logs / reviews / list updates.

Right now the profile page is closer to an account settings stub.

### Must-have missing capability 5: import and migration

For this category, import is not optional.
People already have history elsewhere.

At minimum:

- CSV import from common tracker formats;
- export of ratings and tracking history;
- migration tooling for watchlists/backlogs.

Without import, onboarding will be painful for the exact users most
likely to care about a tracker.

### Must-have missing capability 6: stats and recap loops

Tracker products keep people because they reflect identity back to them.
Denn needs:

- totals by media type;
- monthly/yearly activity;
- average ratings by type;
- top genres / creators / decades;
- completion trends;
- yearly recap.

The landing page already implies this value, but the product does not
yet deliver it.

## What Can Improve But Is Not Strictly "Must-Have"

- Better public discovery for lists and people.
- Recommendation engine based on ratings, lists, and social graph.
- Editorial or network-driven homepage instead of only provider
  trending.
- Notifications for invites, follows, comments, likes, and list
  updates.
- Better onboarding for "create your first watchlist / backlog / diary".
- Stronger media-specific nuances:
  movie rewatches, TV episode progress, album first listen vs replay,
  game platform edition, book edition handling.
- Better moderation/privacy settings once public social surfaces exist.

## Product Strategy Options

The repo is broad enough that Denn can still become different kinds of
product. These are the three realistic paths from here.

### Option A: Double down on collaborative lists

Position Denn as the best multi-media shared list app.

Pros:

- fits what is already strongest;
- lower scope;
- less need for public social complexity;
- easier to ship polish quickly.

Cons:

- weaker differentiation versus general productivity/curation tools;
- less aligned with the Letterboxd/RYM comparison;
- lower long-term habit potential.

### Option B: Build a cross-media personal tracker with a light social layer

Position Denn as a tracker first, social second.

Pros:

- matches the current architecture;
- fixes the core product gap without requiring a full social network on
  day one;
- can add public profiles, follows, and feed incrementally;
- most realistic path from current state.

Cons:

- still a large scope;
- requires a new canonical tracking model;
- some current list-centric UX will need reframing.

### Option C: Build a full public social network across five media types

Position Denn as "Letterboxd + RYM + Goodreads + Backloggd in one app".

Pros:

- big vision;
- potentially strong differentiation if executed well.

Cons:

- too broad for the current product maturity;
- high moderation, growth, and UX complexity;
- enormous risk of becoming shallow in every vertical.

### Recommendation

Recommend Option B.

Denn should become a first-class tracker before it tries to become a
full social network. The project already has the metadata and identity
foundation to support that move. It does not yet have the product loops
or public surface to justify the bigger social claim.

## Recommended Roadmap

### Phase 0: Fix product honesty and remove self-inflicted confusion

Goal: make the current product proposition truthful.

Ship:

- update landing copy so it stops overstating shipped social/stat
  capabilities;
- turn the current profile page into a real profile summary using the
  data the backend already exposes;
- define visibility rules for content pages, lists, and profiles
  (`private`, `shared`, `public`);
- decide whether content detail pages can be public-read;
- document the product direction explicitly.

Why first:

Because right now the product promise is fuzzier than the engineering.

### Phase 1: Create the real tracking core

Goal: make Denn a tracker, not just a list app.

Ship:

- a dedicated `UserContentState`-style model;
- media-aware statuses;
- first completion date plus optional multi-log history;
- default system collections such as watchlist/backlog/history/favorites;
- first stats dashboard driven by tracking records, not list items.

Why first:

This is the single biggest gap between the current app and the category.

### Phase 2: Build the minimum viable public social layer

Goal: make taste visible and shareable.

Ship:

- public profiles;
- public lists;
- public content pages with visible community ratings;
- follow/unfollow;
- simple activity feed from follows;
- shareable canonical URLs.

Why now:

Once tracking exists, social activity has something real to show.

### Phase 3: Separate reviews from ratings

Goal: create actual community discourse.

Ship:

- dedicated reviews;
- spoiler flag;
- likes/helpfulness;
- comments or replies;
- review sorting;
- profile tabs for logs vs reviews vs lists.

Why now:

This creates a stronger social loop than ratings alone.

### Phase 4: Add migration, stats depth, and recommendation loops

Goal: improve retention and switching.

Ship:

- import/export;
- richer stats and yearly recap;
- network and taste-based recommendations;
- better notifications and re-engagement.

Why last:

These features compound value, but they are weak without the earlier
identity, tracking, and public-social foundations.

## Concrete Priorities For The Next 2-3 Iterations

If scope must stay disciplined, do these first:

1. Enrich `/profile` into a real profile summary.
2. Make landing copy honest about current capabilities.
3. Decide and implement public-read rules for content pages.
4. Introduce a first-class tracking model separate from lists.
5. Add default system collections or statuses instead of relying on
   user-named lists.
6. Expose public profiles and public lists.
7. Add follow relationships and a simple feed.

If those seven happen, Denn stops feeling like an unfinished list app
and starts feeling like a real tracker with social momentum.

## Final Verdict

Denn is good where many early products are weak:

- architecture;
- metadata breadth;
- domain modeling;
- collaborative list mechanics.

Denn is weak where the category actually wins users:

- identity;
- habit loops;
- public discovery;
- social graph;
- first-class tracking;
- profiles and stats.

So the honest verdict is:

Denn is promising and technically serious, but product-wise it is still
in the gap between "foundation" and "real destination".

Today it is not yet a credible Letterboxd/RYM alternative.
It is a credible base for building one, if the next work shifts from
infrastructure polish toward tracking, public surface, and social loops.
