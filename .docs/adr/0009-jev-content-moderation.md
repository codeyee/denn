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
`content_moderation_job` outbox. Identity resolution can also enqueue a bounded
`content_metadata_preparation_job` for homepage items with no normalized
detail. Each queue is drained by its own bounded management command
(`run_moderation_worker`, `run_metadata_preparation_worker`). Run one instance
of each until multi-instance concurrency and persistence fencing are validated
on PostgreSQL. A request never waits on Jev, and classification failure never
fails ingestion.

**Separate manual backfill.** Existing rows are classified only by the manual,
resumable `backfill_content_moderation` command, which requires
`--confirm-live` and a positive `--limit`. Startup never scans the catalog.

**One wire attempt.** The adapter builds the SDK client with
`RetryPolicy(max_retries=0)`. Timeouts and unexpected failures become
`outcome_unknown` for manual reconciliation instead of automatic re-sends.

**Narrow public API.** Core exposes only `{status, classification}` on content
detail, list, and local-summary responses. `status` is `missing`, `pending`,
`complete`, `stale`, or `error`. Probabilities, hashes, tokens, and payloads
stay private.

**Two Web surface rules, behind one flag.** With
`WEB_MODERATION_VISIBILITY_ENABLED=true` (Web server only, default off):

- Homepage: drop only current, complete, explicit items before the featured
  banner and carousels are selected.
- Detail: blur current, complete, explicit artwork unless the viewer has
  `allow_adult_content=true`. A local reveal control does not change the
  saved preference.

**Product decision (user, 2026-09).** Pending, stale, missing, unknown, and
`needs_review` items stay visible on the homepage and are not blurred on
detail. There is no placeholder in v1. Blur is presentation, not access
control: image URLs remain reachable.

## Consequences

- Denn gains explainable, replayable judgments for providers without reliable
  flags, and the provider override keeps TMDB authoritative.
- Core classification and Web visibility are independent flags. Enabling
  `MODERATION_CLASSIFICATION_ENABLED` does not change what viewers see, and
  rollback is turning the Web flag off first.
- Items without a fresh judgment are shown until classified, so a first-visit
  window exists after activation or a source change.
- Proxy's 5-minute homepage candidate cache and Web's 5-minute query
  `staleTime` delay homepage removal after a new explicit judgment.
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
- **Hide everything unclassified.** Rejected for v1 by product decision.
