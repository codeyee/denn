# Post-Foundation MVP Feature Roadmap

Date: 2026-04-20
Status: planned

## Why This Document Exists

This document turns the validated MVP product design into a feature
roadmap after the current optimization and platform-hardening work.

For this roadmap, one sprint equals one product feature or one release
epic.
That sprint may span:

- `web`
- `core`
- `proxy`
- migrations and data backfills
- infrastructure and deploy work
- documentation
- follow-up functional and technical decisions discovered during
  implementation

The goal is not to pretend each sprint is small.
The goal is to make every sprint legible as a real product milestone.

## Sequencing Approaches Considered

### Approach A: Domain-First

Ship all deep domain work first:

1. tracking model
2. backlog
3. list permissions
4. public pages
5. profiles
6. leaderboards

Pros:

- strongest data integrity;
- fewer temporary hacks;
- cleaner long-term architecture.

Cons:

- too much invisible work in a row;
- slower user-visible payoff;
- higher risk of losing product momentum.

### Approach B: Public-Surface-First

Ship public content pages, public profiles, and leaderboards early, and
rebuild the tracking model afterward.

Pros:

- faster visible marketing value;
- easier to demo externally.

Cons:

- public product would sit on top of an incorrect tracking model;
- high risk of rework in ratings, profile, and aggregate logic;
- likely duplication between old and new product rules.

### Approach C: Balanced Vertical Slices

First fix the product source of truth, then ship outward-facing features
in dependency order.

Recommended sequence:

1. personal tracking foundation
2. lists 2.0
3. public catalog
4. public profiles
5. leaderboards
6. public launch hardening

This is the recommended approach.
It keeps the model honest, but still ships visible product value at a
steady pace.

## Execution Assumptions

- The current optimization track must reach a "no longer blocking
  product work" state before Sprint 11 starts.
- The old `Sprint 08.5` / `Sprint 09` blocker set is effectively
  resolved: SSR data flow, TanStack Query prefetch, and auth continuity
  are now part of the merged foundation.
- `Sprint 10` is a soft blocker for large anonymous catalog traffic.
  It does not need to be perfect before Sprint 11 starts, but public
  catalog traffic should not launch while freshness policy is still
  brittle.
- Every feature sprint can be split into several PRs or batches.
- The roadmap below is ordered by dependency, not by staffing
  parallelism. Some internal preparation may happen in parallel, but the
  user-facing release order should remain coherent.

## Recommended Sprint Sequence

## Sprint 11
## Personal Tracking 1.0

### Goal

Turn Denn into a real personal tracker instead of a list app with a
status field.

### Primary Deliverable

Ship a first-class user-owned tracking model with:

- `backlog`
- `in_progress`
- `completed`
- `on_hold`
- `dropped`

This sprint also introduces:

- completion-gated ratings;
- inactive ratings and reviews outside `completed`;
- auto-complete when rating from a content page;
- built-in system backlog;
- conservative migration from current data.

### Modules And Workstreams

`core`:

- new tracking model and API surface;
- migration strategy from current ratings and completed list items;
- write rules for status transitions and rating activation;
- updated aggregates to ignore inactive ratings;
- tests for state transitions and migration safety.

`web`:

- tracking controls on content pages;
- backlog add/remove entrypoints;
- updated rating flows;
- status presentation on content and list surfaces.

`proxy`:

- likely no major new domain responsibility;
- only touch if content reads need minor contract support for tracking
  UX.

`infra/data`:

- schema migration;
- conservative backfill or seed job;
- release plan that avoids double-writing bugs.

### Decisions To Finalize Inside The Sprint

- exact table shape for tracking and inactive rating state;
- how TV season items in lists resolve toward series-level tracking;
- whether migration runs synchronously or as a background repair step;
- how to keep query count under control on list and profile reads.

### Why This Sprint Comes First

Profiles, public content pages, favorites, and leaderboards all depend
on correct tracking semantics.
If this layer is wrong, every public feature above it is built on sand.

## Sprint 12
## Lists 2.0

### Goal

Turn lists into a real editorial and collaborative system instead of a
single-mode container.

### Primary Deliverable

Ship the new list model with:

- visibility separated from collaboration mode;
- `owner`, `editor`, and `viewer` roles;
- public and private list behavior;
- personal and collaborative list behavior;
- per-member status inside collaborative lists;
- public list pages for lists marked public.

### Modules And Workstreams

`core`:

- permission model and role checks;
- new visibility fields and policy enforcement;
- public list read endpoints;
- collaborative item-state storage and read model;
- regression tests for permission matrix.

`web`:

- list settings UI for visibility and roles;
- invite and membership management UX;
- public list route and anonymous read experience;
- collaborative per-member state rendering.

`proxy`:

- no major ownership change expected.

`infra/docs`:

- permission matrix documentation;
- rollout notes for existing shared lists.

### Decisions To Finalize Inside The Sprint

- who can invite members;
- who can change visibility;
- who can reorder canonical order;
- whether viewers can leave personal state updates inside collaborative
  lists without broader edit permissions;
- how system backlog is excluded from normal list settings.

### Why This Sprint Comes Before Public Catalog

Public content pages and public profiles both need a stable notion of
what a public list is.
Shipping public catalog pages before defining public lists creates
avoidable inconsistency.

## Sprint 13
## Public Catalog 1.0

### Goal

Make Denn publicly discoverable as a multi-media catalog without
requiring login.

### Primary Deliverable

Ship the first anonymous public catalog surface:

- public search for works only;
- public browse pages by media type;
- public content pages;
- SEO-ready route metadata and canonical behavior;
- social metadata on content pages:
  - average score
  - rating count
  - score distribution
  - recent reviews
  - public lists containing the work

### Modules And Workstreams

`web`:

- remove auth-gating from selected public routes;
- build anonymous search and browse experiences;
- upgrade content detail pages for SSR, metadata, and SEO;
- add sitemap and route metadata where needed.

`core`:

- public read endpoints for aggregates and recent reviews;
- public list inclusion module for content pages;
- anonymous-safe serializers and pagination.

`proxy`:

- review browse/search provider dependencies for anonymous traffic;
- tighten caching and rate-awareness where catalog traffic spikes are
  likely.

`infra`:

- cache strategy for anonymous read routes;
- deployment notes for sitemap and crawl behavior.

### Decisions To Finalize Inside The Sprint

- browse taxonomy per media type;
- empty-state behavior for unrated works;
- anonymous cache TTLs;
- canonical URL and structured metadata rules.

### Why This Sprint Matters

This is the moment Denn stops being an auth-walled product and becomes a
real public catalog that can win via search, sharing, and discovery.

## Sprint 14
## Public Profiles 1.0

### Goal

Make user taste visible and legible through a real public identity.

### Primary Deliverable

Ship public profile pages with:

- unique `username` route;
- short bio;
- basic counters by media type;
- recent reviews;
- favorites by media type;
- public lists module;
- all ratings view with filters and sorting.

### Modules And Workstreams

`core`:

- public profile endpoints and serializers;
- username uniqueness and backfill strategy;
- profile edit endpoints for bio and public-facing settings;
- efficient rating list pagination and filtering.

`web`:

- public profile page;
- profile settings UI;
- ratings tab or section with filter/sort controls;
- favorites and recent review presentation.

`proxy`:

- no primary ownership expected.

`infra/data`:

- username constraint or migration work;
- backfill plan for legacy users if usernames are incomplete or not
  normalized yet.

### Decisions To Finalize Inside The Sprint

- username reservation or backfill rules;
- bio length and formatting constraints;
- default sort modes for public ratings;
- how to present favorites when a user has not selected any.

### Why This Sprint Comes After Public Catalog

Public content pages give Denn discoverable objects.
Public profiles give Denn visible taste.
That is the first true social-product shape of the MVP.

## Sprint 15
## Leaderboards 1.0

### Goal

Add a structured public discovery loop based on taste aggregation rather
than only search and direct links.

### Primary Deliverable

Ship three public leaderboard families by media type:

- `top rated`
- `most loved`
- `most popular`

All rankings must use weighted averages or equivalent Bayesian logic
plus minimum-vote thresholds.

### Modules And Workstreams

`core`:

- ranking formulas and thresholds;
- aggregation or materialization strategy;
- endpoints for leaderboard reads by media type;
- tests for ranking correctness and threshold enforcement.

`web`:

- leaderboard pages and navigation;
- media-type switching;
- empty and low-signal states.

`proxy`:

- no likely domain change, unless additional provider metadata is needed
  to enrich list cards or browse cards at scale.

`infra`:

- scheduled recomputation if rankings are materialized;
- caching strategy for leaderboard pages.

### Decisions To Finalize Inside The Sprint

- minimum vote threshold per media type;
- refresh cadence for ranking snapshots;
- tie-breaking policy;
- whether seasons appear in all ranking families or only selected ones.

### Why This Sprint Is Separate

Leaderboards look simple, but they mix product, math, and performance.
They deserve their own sprint instead of being buried inside public
catalog work.

## Sprint 16
## Public Safety And MVP Launch Hardening

### Goal

Make the public MVP safe enough, observable enough, and operationally
ready enough to launch with confidence.

### Primary Deliverable

Ship the public-surface hardening package:

- report public reviews;
- report public lists;
- admin or operator triage path;
- anonymous traffic rate protection where needed;
- final SEO pass;
- cache review for public pages;
- launch checklist and rollback plan.

### Modules And Workstreams

`core`:

- report models and endpoints;
- basic moderation workflow or operator-facing admin handling;
- audit logging where needed.

`web`:

- report actions in public review and list surfaces;
- user-facing acknowledgement states;
- final polish for anonymous/public routes.

`proxy`:

- confirm anonymous traffic safety;
- apply rate-limiting or cache adjustments if provider-facing traffic
  could spike.

`infra`:

- alerting and dashboards for public route health;
- deploy and rollback checklist;
- sitemap and crawl validation;
- cache and CDN verification.

### Decisions To Finalize Inside The Sprint

- report reason taxonomy;
- operator workflow for handling reports;
- rollout strategy and feature-flag use;
- whether public launch is soft-launch, invite-only, or fully open.

### Why This Sprint Is Not Optional

A public product without basic reporting, caching, and traffic guardrails
is not an MVP.
It is a stress test.

## What Stays Outside This MVP Sequence

These are valid future sprints, but they should not block the roadmap
above:

- follow graph;
- simple activity feed;
- likes;
- comments and replies on reviews;
- external platform importers;
- advanced stats and recap;
- advanced leaderboard filters.

## Recommended Next Documentation Step

Detailed sprint plans now live here:

1. [`Sprint 11 - Personal Tracking 1.0`](../sprints/sprint-11-personal-tracking-1-0.md)
2. [`Sprint 12 - Lists 2.0`](../sprints/sprint-12-lists-2-0.md)
3. [`Sprint 13 - Public Catalog 1.0`](../sprints/sprint-13-public-catalog-1-0.md)
4. [`Sprint 14 - Public Profiles 1.0`](../sprints/sprint-14-public-profiles-1-0.md)
5. [`Sprint 15 - Leaderboards 1.0`](../sprints/sprint-15-leaderboards-1-0.md)
6. [`Sprint 16 - Public Safety And MVP Launch Hardening`](../sprints/sprint-16-public-safety-and-mvp-launch-hardening.md)
