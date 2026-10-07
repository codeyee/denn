# ADR 0009: Jev content moderation

## Status

Accepted on 2026-09-28 for issue [#102](https://github.com/codeyee/denn/issues/102).
The capability is merged and off by default. Nothing here asserts that it is
enabled in any deployed environment.

## Context

Upstream providers report adult-content signals unevenly. TMDB exposes an
adult flag and IGDB exposes ESRB ratings, but neither is complete; Spotify and
OpenLibrary expose no trustworthy equivalent. All of them also carry weaker,
contextual metadata (certifications, age-rating descriptors, keywords, genres,
explicit-lyrics flags, subjects). Treating missing metadata as safe would let
explicit items reach the homepage and detail artwork. Denn wanted a reusable, explainable judgment per content
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
payloads are excluded. From question revision `q4` that text includes provider
safety metadata (see "Provider safety metadata" below).

**Code-owned deterministic policy.** `content/moderation/policy.py` composes
the three probabilities and the provider rule. Two provider rules are
authoritative overrides (`provider-rule:v2`): a TMDB movie or TV show whose
`adult` flag is true, and an IGDB game with an `ESRB` age rating of exactly
`AO`. An affirmative rule is always explicit and makes no Jev call. An absent
or false flag never certifies safety, and nothing else is an override. Unknown,
failed, incomplete, or low-confidence results become `unknown` or
`needs_review`, never safe. Thresholds and the policy revision are code-owned
and provisional.

**Provider safety metadata (`q4`).** Proxy adds optional safety fields to its
detail payloads without new provider requests: TMDB `adult`, genres, keywords,
and region certifications; IGDB keywords and age ratings with descriptors;
Spotify's per-track `explicit`; OpenLibrary subjects. Core validates and
persists them defensively (malformed entries are dropped, lists are capped, and
a refresh that omits a field clears it, because the provider is the source of
truth) and never fails a detail write over them.

- *Authoritative* (code-owned overrides, applied before and independently of
  Jev): TMDB `adult` true and ESRB `AO`. The `adult` flag is never part of the
  Jev state.
- *Contextual* (text in the Jev state, never an override and never proof of
  safety): genres, keywords (at most 40), the per-track advisory, and book
  subjects (at most 30).
- *Persisted but not sent to Jev*: TMDB certifications and IGDB age ratings
  with descriptors. Core keeps them (the ESRB `AO` rule reads them from the
  persisted detail, and future admin tooling can show them), but they are not
  in the state and do not affect the source hash.
- The `q4` question guidance tells Jev that keywords, genres, subjects, and the
  track advisory support a restricted-category judgment but are not a verdict:
  an explicit-lyrics advisory alone or a genre alone is not evidence of adult
  sexual content, while explicit sexual keywords or subjects are strong
  evidence. The three Noul keys and their binary intent are unchanged.

*Ratings stay out of the state (2026-09-28 decision).* The first `q4` design
also sent certifications and age ratings. A local re-evaluation on the same 400
human/silver-labelled cases (6 explicit) with `jev-1.13.0` compared three
states:

| State | Explicit reaching the strict homepage | Safe hidden (of 390) | Explicit blurred (of 6) | Blur false positives |
| --- | ---: | ---: | ---: | ---: |
| `q3` (text only) | 1 | 9 | 5 | 1 |
| `q4` with ratings | 0 | 25 | 4 | 2 |
| `q4` without ratings | 0 | 21 | 4 | 2 |

Nearly all the new false `needs_review` and `explicit` results were mainstream
titles whose only new signal was a mature rating (US R, TV-MA, ACB R 18+ or MA
15+), despite the guidance. Dropping ratings kept the goal that matters most to
the maintainer (no explicit item on the homepage) and cost slightly fewer
tokens. This is provisional: six explicit cases is too few to separate the
variants statistically, and the evaluation is local. Re-evaluate with
production data before changing it. The revision stays `q4` because nothing has
been classified with `q4` outside local experiments.

Because the state shape changed, every materialized source hash from `q3` is
outdated. `backfill_moderation_source_hashes --recompute` refreshes them in
bounded batches without any Jev or Proxy call and must run after any state or
question revision change, before classification workers run. As a safeguard,
the worker supersedes a job whose hash no longer matches the state builder
instead of calling Jev for a result it could not attach to that job. `q1` to
`q3` judgments stay immutable history and are not current under `q4`. Rows
written as `provider-rule:v1` remain valid: every rule so far only adds
overrides, so a `v1` row is still a correct explicit judgment.

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
  flags, and the provider rules keep TMDB `adult` and ESRB `AO` authoritative.
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
- Moving to `q4` invalidates every materialized source hash and every earlier
  judgment. After `--recompute`, the strict homepage stays thin until items are
  reclassified under `q4`, which costs new Jev calls; existing rows also need a
  rehydration to gain the new fields (see the
  [worker runbook](../runbooks/jev-moderation-workers.md)).
- The hash covers only the Jev state, and the authoritative flag is deliberately
  outside it. A TMDB `adult` flip that changes no state text does not create a
  new judgment identity, so it is not applied to an item that already has a
  current judgment until its text, the model, or the revision changes. An ESRB
  rating change does alter the state text and is picked up.
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
- **Send the authoritative flag to Jev.** Rejected: an override is a code
  decision, not evidence to weigh, and it would let a stale or wrong flag sway
  the model instead of being applied deterministically.
- **Treat mature ratings or explicit lyrics as overrides.** Rejected: R, M, 18,
  TV-MA, and explicit-lyrics advisories describe ordinary entertainment, so an
  override would hide and blur far more than adult sexual content. They are
  context for Jev.
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
- **OpenAI Decisions API (`gpt-6-luna`), with or without the cover image.**
  Rejected for now (2026-10-07). On the same 400 reviewed cases it blurred no
  more explicit items than Jev but produced 11–16 false blurs instead of 2, and
  with the cover image one explicit item reached the strict homepage. The image
  recognized only 2 of 5 explicit posters and added no explicit poster beyond
  Jev's work-level rule. It is in public beta, costs about 2.4× Jev per input
  token, and refused one question. See the
  [comparison results](../runbooks/jev-moderation-evaluation.md#results-2026-10-07-openai-decisions-api-comparison).

## Provider portability

Jev stays the provider, called through the TypeSafe API. The decision does not
depend on TypeSafe being the only possible source of these judgments:

- `content/moderation/client.py` is the only code that knows the provider. Its
  contract is `classify(state) -> ModerationJudgment(model, nouls, usage)`, and
  the state, questions, policy, persistence, and Web surfaces do not change
  with the provider.
- The question shape (`noul` with `instructions` and `true`/`false`
  `criteria`) is also accepted unchanged by OpenRouter's
  `POST /api/alpha/decisions`, which already serves Jev and OpenAI's Decisions
  model. A compatible provider can therefore be added as a second adapter
  without rewriting the questions.
- Switching is not configuration only. Probabilities are model-specific, so a
  new provider requires re-running the
  [evaluation workflow](../runbooks/jev-moderation-evaluation.md#catalog-evaluation-workflow)
  and retuning the thresholds first. The resolved model is part of the
  judgment identity, so the switch also re-classifies the catalog once.
- Image input would also need the artwork bytes (provider CDNs are not called
  by Core today), the image in the source hash, and a separate artwork
  question; the 2026-10-07 comparison did not justify that.
