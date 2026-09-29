# ADR 0009: Jev content moderation

## Status

Accepted on 2026-09-28 for issue [#102](https://github.com/codeyee/denn/issues/102).
The capability is merged and off by default. Nothing here asserts that it is
enabled in any deployed environment.

## Context

Upstream providers report adult-content signals unevenly. TMDB exposes an
adult flag; IGDB, Spotify, and OpenLibrary expose no trustworthy equivalent.
Treating missing metadata as safe would let explicit items reach the homepage
and detail artwork. Denn wanted a reusable, explainable judgment per content
item without breaking the service boundaries: `proxy` is stateless and owns
provider credentials, and `core` owns normalized content and persistence.

## Decision

**Core classifies, with a server-only key.** Core calls TypeSafe System One
(Jev) through the pinned `typesafe-sdk` and one adapter,
`content/moderation/client.py`. `TYPESAFE_API_KEY` exists only in Core's
server environment. It never lives in Proxy, Web, or the browser.

**Three independent typed questions.** Jev answers `safe_for_automatic_discovery`,
`explicit_or_sensitive`, and `needs_review` separately. Input is a named,
text-only state built from text Core already persists (title, description, and
content-specific fields); identifiers, URLs, images, dates, and raw provider
payloads are excluded.

**Code-owned deterministic policy.** `content/moderation/policy.py` composes
the three probabilities and the provider flag. The TMDB adult flag is an
authoritative override: an affirmative flag is always explicit and makes no Jev
call. An absent or false flag never certifies safety. Unknown, failed,
incomplete, or low-confidence results become `unknown` or `needs_review`, never
safe. Thresholds and the policy revision are code-owned and provisional.

**Versioned, immutable judgments.** `ContentModerationJudgment` is unique on
`(content_item, source_data_hash, model_name, question_revision)`. The model is
the concrete version Jev returned (for example `jev-1.13.0`), not the requested
alias. Changed source text makes a judgment stale instead of overwriting it.
Policy revision is excluded from identity so policy changes re-evaluate from
the stored payload without new inference.

**Asynchronous classification.** A normalized detail write stores the current
source hash and, in the same transaction, coalesces a row in the
`content_moderation_job` outbox. Identity resolution keeps that pipeline
supplied without operator action, only while classification is enabled: it
enqueues a bounded `content_metadata_preparation_job` for items with no
normalized detail or with detail but no current source hash, and one
`content_moderation_job` for items that have detail and a hash but no current
judgment. The moderation admission is bulk, never per item: at most one read of
existing job identities, one read of current judgments, and one
`bulk_create(..., ignore_conflicts=True)`. An existing job of any status blocks
a new one, so a failed or `outcome_unknown` job is never re-sent to Jev. Each
queue is drained by its own bounded management command (`run_moderation_worker`,
`run_metadata_preparation_worker`). Run one instance of each until
multi-instance concurrency and persistence fencing are validated on PostgreSQL.
A request never waits on Jev, and classification failure never fails ingestion.

**Separate manual backfill.** Beyond the items the resolver admits, existing
rows are classified only by the manual, resumable
`backfill_content_moderation` command, which requires `--confirm-live` and a
positive `--limit`. Startup never scans the catalog.

**One wire attempt.** The adapter builds the SDK client with
`RetryPolicy(max_retries=0)`. Timeouts and unexpected failures become
`outcome_unknown` for manual reconciliation instead of automatic re-sends.

**Narrow public API.** Core exposes only `{status, classification}` on content
detail, list, and local-summary responses. `status` is `missing`, `pending`,
`complete`, `stale`, or `error`. Probabilities, hashes, tokens, and payloads
stay private.

**Two Web surface rules, behind one flag.** With
`WEB_MODERATION_VISIBILITY_ENABLED=true` (Web server only, default off):

- Homepage (strict): keep only items whose current moderation summary is
  exactly `{status: "complete", classification: "safe"}`. Explicit,
  `needs_review`, pending, stale, missing, error, malformed, and unresolved
  items are all excluded before the featured banner and carousels are
  selected. Web resolves identities and summaries once, in bulk, on the same
  path for SSR and the `/api/proxy/homepage` BFF.
- Detail and cards: blur current, complete, explicit artwork unless the viewer
  has `allow_adult_content=true`. A local reveal control does not change the
  saved preference. Cards cover search, Browse, list detail, public lists and
  profiles (favorites, progress, reviews), and the homepage's in-progress
  carousel.

**Product decision (maintainer, 2026-09, revised).** The homepage is strict: it
shows only currently classified-safe items. This supersedes the earlier choice
to show unclassified items there. Search, Browse, lists, profiles, and detail
remain visible regardless of moderation state, `needs_review` is not blurred,
and there is no placeholder in v1. Blur is presentation, not access control:
image URLs remain reachable.

**Where card summaries come from.** Search and Browse are resolved through
Core's bulk resolver on the Web server (SSR and the BFF share it). With the Web
flag on, the same response's summary is attached to each item; with it off,
nothing is attached. Lists, profiles, and collections already receive
`moderation` from Core on content summaries, which the Web parses and carries
onto the card item. Because that Core data reaches the browser regardless of
the flag, the visibility flag stays server-only: the root route's `beforeLoad`
resolves it into router context, and only that non-secret boolean (never the
environment variable) reaches the client through a small presentation provider,
alongside the viewer's `allow_adult_content` from the same server-resolved
session. With the flag off, or with no provider, cards never blur. The blur
rule is exactly `shouldBlurModerationArtwork` (current complete explicit, viewer
not opted in); `needs_review` is not blurred. The reveal control is local, does
not navigate, and does not change layout.

**Self-healing strict homepage.** A strict homepage would stay thin until
someone classified its candidates, so the bulk resolver admits the missing
preparation and classification work itself (see Asynchronous classification).
New candidates become eligible within worker polling time, with no operator
action. Web has no separate admission path: the resolver stays the single
owner of identity and work admission.

## Consequences

- Denn gains explainable, replayable judgments for providers without reliable
  flags, and the provider override keeps TMDB authoritative.
- Core classification and Web visibility are independent flags. Enabling
  `MODERATION_CLASSIFICATION_ENABLED` does not change what viewers see, and
  rollback is turning the Web flag off first.
- A strict homepage can be thin, or empty in a category, while classification
  catches up after activation, a source change, or a model or question-revision
  bump. The UI shows no banner and no empty carousel in that case instead of a
  placeholder.
- The resolver admits classification work for every resolved item, including
  search and Browse results, so those items are classified without a
  separate scan. Admission is bounded per request (at most 200 items) and by
  identity dedupe, but there is no global cap on queued moderation jobs; the
  worker bounds are the only spend control.
- Proxy's 5-minute homepage candidate cache and Web's 5-minute query
  `staleTime` delay homepage changes after a new judgment. Search and Browse
  query caches are keyed without the visibility flag, so a client that stays
  open across a flag change keeps its old summaries until it reloads.
- Some artwork surfaces have no moderation data or no blur yet (see
  [technical debt](../technical-debt.md)).
- The worker bounds are per process, not a global provider-call or cost cap.
- Admin review, manual classification, and non-homepage surfaces for
  `needs_review` are deferred (see issue
  [#113](https://github.com/codeyee/denn/issues/113) and the
  [product-flow note](../ideas/jev-content-moderation-product-flow.md)).
- Operations live in the
  [worker runbook](../runbooks/jev-moderation-workers.md), the
  [backfill runbook](../runbooks/content-moderation-backfill.md), and the
  [evaluation runbook](../runbooks/jev-moderation-evaluation.md). The visible
  behavior is described in
  [content eligibility](../architecture/content-eligibility.md).

## Alternatives considered

- **Classify in Proxy.** Rejected: Proxy is stateless and owns only provider
  credentials, so it cannot persist versioned judgments.
- **Classify synchronously in the detail request.** Rejected: it couples
  detail latency and availability to a remote model.
- **Keyword filtering.** Rejected: brittle and without multilingual judgment.
  A lexicon is used only to enrich evaluation samples, never as a classifier.
- **Show unclassified homepage items until classified.** Chosen earlier in v1
  and superseded: it let unclassified explicit content reach the banner during
  the first-visit window.
- **Hide everything unclassified on every surface.** Rejected: only the
  homepage, an automatic-discovery surface, is strict. Search, Browse, lists,
  profiles, and detail stay visible.
- **Classify homepage candidates only with the manual backfill.** Rejected for
  the strict homepage: it would require operator action for every new
  candidate. The manual backfill remains for the initial legacy catalog.
