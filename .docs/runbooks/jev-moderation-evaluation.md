# Jev moderation evaluation data contract

This page defines the privacy-safe input contract and classification-report contract for the offline JEV-006 evaluation. Schema validation, classification metrics, and accounting are pure. The optional injected-client orchestrator makes no client construction, network, or database call of its own; it invokes only the supplied client's `classify` method. The committed fixture is synthetic and tests mechanics only; it is not evidence of Jev accuracy.

## Gold cases: `jev-moderation-gold-cases/v2`

A UTF-8 JSON dataset has only `schema_version` and `cases`. Schema v2 matches the
`q4` moderation state, which adds provider safety metadata to `type_specific`:
movie and TV show `genres` and `keywords`; game `keywords`; album track
`parental_advisory` (`explicit` or empty); book `subjects`. Certifications and
age ratings are persisted by Core but deliberately not part of the state. v1
documents are rejected, so re-export candidates
(see [the workflow](#catalog-evaluation-workflow)) and carry labels over by
`case_id`. Each case has exactly:

| Field | Meaning |
|---|---|
| `case_id` | Unique opaque `case_` plus 12 lowercase hexadecimal characters. |
| `split` | `development`, `evaluation`, or `holdout`. |
| `source_kind` | `synthetic_text` or `catalog_text`. |
| `provider`, `content_type` | Provider slug and one supported Core type. |
| `language` | Manually labeled `en`, `es`, or `other`. Keep it outside `state`; it must not become model input. |
| `state` | Exact text-only state built for moderation, with provider/type agreement and an exact content-specific shape. |
| `gold_class` | `safe_for_automatic_discovery`, `explicit_or_sensitive`, or `needs_review`. |
| `adjudication` | Exact `status`, `reviewer_count`, and `guideline_revision` fields. Human labels require at least one reviewer. |
| `provider_explicit` | Exact boolean or null; true is allowed only for TMDB movies/TV shows and IGDB games (ESRB `AO`) and is a policy override, not a gold label. |

Validation rejects extra/missing fields, duplicate or non-opaque case IDs, unknown content-specific state fields, URLs, credential-like strings, JWT-like text, wrong metadata, and non-text state values. It does not normalize classifier input. Never commit raw URLs, provider/external IDs, credentials, or unreviewed catalog text. See `core/content/moderation/evaluation_cases.py` for the executable schema.

## Sampling and evidence limits

The local catalog has only 18 eligible books and no stored language field, so an equal-balanced cross-provider or EN/ES sample cannot be drawn from it; the catalog workflow below stratifies by provider/type instead and labels language manually. The committed synthetic fixture tests mechanics only and is not a model-quality result. See [the 2026-09-28 results](#results-2026-09-28-catalog-evaluation) for the representative catalog evaluation.


## Pure classification report contract: `jev-moderation-evaluation-report/v2`

`build_evaluation_report(dataset, observations)` accepts exactly one strict outcome record per gold case. It has no client, network, or database access. Jev-only and final-policy metrics are reported separately. Unknown, unavailable, skipped, and `needs_review` abstentions remain visible. All failures remain in their gold-class support and recall denominators. If `provider_explicit=true` (a TMDB movie/TV or IGDB game case), `policy_prediction` must be `explicit_or_sensitive`; an inconsistent outcome is rejected rather than reported as an applied override.

The report provides the class confusion matrices; Jev-only and final-policy per-class precision/recall; gold-explicit-to-predicted-safe false-negative rate; needs-review recall; and model-version consistency. It also provides per-provider and per-language quality summaries. Each stratum reports its case count, per-class true/false positives, false negatives and support, explicit false-negative rate, needs-review recall, and coverage. Every metric includes its numerator and denominator. A zero denominator returns `null` and displays `N/A`; the case count makes sparse strata visible without inventing a minimum-sample threshold. Provider overrides appear only in final-policy metrics, never as Jev model quality.

Coverage is calculated independently for `jev_only` and `final_policy`. Each `needs_review_abstention_rate` is `count(prediction == needs_review) / case_count`; each outcome rate uses the full case count in that report or stratum. Class recall is `true_positive / gold_class_support`, where support includes every case in that gold class, including unavailable, unknown, and skipped outcomes. Precision is `true_positive / count(predicted_class)`. The gold-explicit false-negative rate is `count(gold == explicit_or_sensitive and prediction == safe_for_automatic_discovery) / count(gold == explicit_or_sensitive)`. Needs-review recall is `count(gold == needs_review and prediction == needs_review) / count(gold == needs_review)`. These formulas apply separately to Jev-only and final-policy outcomes.

Record a concrete returned model such as `jev-1.13.0`. A moving alias such as `jev-latest`, a missing version, or mixed versions makes a single-version comparison ineligible. See the [TypeSafe model guidance](https://docs.typesafe.ai/models). The report's `go_no_go.status` is always `INSUFFICIENT`: the code never sets pass thresholds or attests that a sample is representative; the go/no-go is a recorded human decision (see the results section).

The pure accounting function accepts optional caller-supplied per-case durations; its p50/p95 are not SDK latency. The injected orchestrator supplies wall time measured only around each `classify` invocation, excluding validation and aggregation; this includes adapter behavior and is not Jev-service-only latency. It keeps known input/output token totals and counts incomplete usage. Cost is reported only with price rates and a short price-provenance label; incomplete usage produces a partial known cost and a null complete total. Zero durations or token counts remain valid measurements; missing values are never replaced with zero.

## Injected execution

`content.moderation.evaluation_orchestration.evaluate_dataset` validates the complete dataset before selecting requested opaque case IDs. It returns the existing v2 aggregated report with an `evaluation_identity` containing the requested model, question revision, policy revision, and exact thresholds. The report rows contain only opaque IDs and classification/accounting fields, not the input state or raw error details.

Pass an already constructed `JevModerationClient` or a fake object with the same `classify(state)` contract. Tests inject a fake; this module does not construct `TypeSafeClient`. Each selected non-override case gets one evaluator-level `classify` invocation. Affirmative provider-override cases (TMDB movie/TV, IGDB game) follow production's hard override and make no invocation. Typed unavailable/skipped outcomes, malformed results, and generic client failures each keep their case in the report. The evaluator has no retry loop. The production adapter constructs TypeSafe with `RetryPolicy(max_retries=0)`, so one default adapter invocation permits at most one SDK wire attempt; injected custom clients may have their own retry behavior.

The returned `execution` section distinguishes selected cases, classify invocations, provider-override no-call cases, and evaluator retries. `latency_ms.source` describes the call-only measurement boundary. Use the fake client for offline checks; do not run the evaluator against a live Jev adapter without a separately approved live-sample plan. Synthetic results must not be used to infer model accuracy or set thresholds.

## Exact-sample preflight

`python manage.py evaluate_jev_moderation` provides a no-call `--dry-run` preflight and a separately gated `--confirm-live` mode. Both validate the privacy-screened dataset, exact opaque case IDs, positive case limit, configured model/question identity, and dated pricing provenance before any client construction. The dry run never constructs a client or makes a network/database call. Live mode uses only the configured `MODERATION_MODEL` and `MODERATION_QUESTION_REVISION`, so the report identity cannot be supplied separately from the production adapter settings.

The configured model must be a concrete versioned ID such as `jev-1.13.0` before a live run; the repository default `jev-latest` is deliberately marked not ready because aliases can move. The command's pricing inputs are a dated snapshot, not a spend limit. Review the [TypeSafe model pricing page](https://docs.typesafe.ai/models) immediately before any live evaluation. On 2026-09-23, the page listed Jev 1.13 input at `$42/Btok` (`$0.042` per million input tokens) and free output tokens; use the then-current published or account-specific rates instead of assuming this snapshot remains current. The provenance value must be a safe label such as `typesafe-models-reviewed-2026-09-23`; it is stored with the report, not sent to Jev.

Example against the synthetic fixture (preflight only; not an accuracy result):

```sh
cd core
python manage.py evaluate_jev_moderation \
  --dataset content/tests/fixtures/jev_moderation_gold_cases_v2.json \
  --case-ids case_17b0c3a43d12,case_8a9720d1c46f \
  --limit 2 \
  --input-price-per-million-tokens 0.042 \
  --output-price-per-million-tokens 0 \
  --price-provenance typesafe-models-reviewed-2026-09-23 \
  --dry-run
```

Inspect `ready_for_live_run` before proceeding. `maximum_case_limit` limits selected cases only. Neither the case limit nor the price snapshot enforces a dollar cap. The preflight itself does not authorize sending catalog content to TypeSafe; use `--confirm-live` only after reviewing the selected text and pricing.

Live mode requires a concrete pinned Jev model, `MODERATION_CLASSIFICATION_ENABLED=True`, and `TYPESAFE_API_KEY` when any selected case needs inference. The environment value is case-sensitive and must be exactly `True` with a capital `T`; lowercase `true` leaves classification disabled. It accepts at most 25 cases, each with a serialized moderation state no larger than 20,000 UTF-8 bytes. Every case ID must be explicit; there is no implicit sampling. Affirmative provider overrides (TMDB movie/TV, IGDB game) are recorded as no-call outcomes.

```sh
cd core
python manage.py evaluate_jev_moderation \
  --dataset content/tests/fixtures/jev_moderation_gold_cases_v2.json \
  --case-ids case_8a9720d1c46f \
  --limit 1 \
  --input-price-per-million-tokens 0.042 \
  --output-price-per-million-tokens 0 \
  --price-provenance typesafe-models-reviewed-2026-09-23 \
  --confirm-live
```

The live JSON report includes `schema_version` (`jev-moderation-evaluation-report/v2`), opaque IDs, classification/accounting metrics, elapsed time, configured model/question revision, and provider-override outcomes. It recursively rebuilds nested metric objects through typed allowlists; unknown fields and invalid values are discarded. It omits moderation state, titles, descriptions, request/response bodies, credentials, and file paths. The TypeSafe SDK's body-bearing logger is disabled only around the client invocation and restored afterward. The production adapter disables SDK retries and the evaluator does not retry; an error message warns that calls may already have been sent, so do not rerun blindly. The command performs no Core database reads or writes.

`usage.cost` is an estimate from the token counts returned by the SDK and the supplied dated rates. Missing usage remains visible as incomplete; provider billing details can differ. `cost_cap_enforced` is always false: case and byte bounds reduce scope, but they are not a hard spend cap. The command's live path is for an intentionally small, reviewed sample, not a bulk backfill. Synthetic fixture results verify the pipeline only and must not be used to claim model accuracy.


## Catalog evaluation workflow

This is the procedure used for the 2026-09-28 catalog evaluation. It sends
catalog text to the second labeling model in step 2 and to Jev in step 3.
Every live run is a separate, explicitly authorized action.

1. **Export candidates (read-only).** Run
   `export_moderation_evaluation_candidates` from `core/`:

   ```sh
   cd core
   python manage.py export_moderation_evaluation_candidates \
     --output /path/outside/the/repo/candidates.json \
     --sample-size 300 --min-per-stratum 30 \
     --sensitive-share 0.35 --seed denn-jev-eval-v1
   ```

   `--output` is required. The other flags shown are set to their defaults:
   `--sample-size` (total cases), `--min-per-stratum` (floor per
   `source_api/content_type` stratum), `--sensitive-share` (target share of
   each stratum drawn from a sensitive-term lexicon, between 0 and 1), and
   `--seed` (a non-empty string). `--max-state-bytes` (default 20,000) skips
   larger states.
   Sampling is stratified and deterministic for the same catalog and
   arguments. The lexicon only enriches the sample so rare sensitive items are
   not drowned out. A match is neither a label nor evidence about the item.
   The command reads the catalog without writing to it and prints the
   sampling summary, including per-stratum counts and skipped items (no
   detail, invalid state, oversized state).

   To re-export an earlier sample against a newer state (for example after a
   question-revision bump), pass `--ids-file PATH` with newline-separated
   `ContentItem` IDs, such as the values of the earlier sidecar
   (`python -c 'import json,sys; print(*json.load(open(sys.argv[1])).values(), sep="\n")' candidates.json.index.json > ids.txt`).
   Nothing is sampled: exactly those items are exported, each still subject to
   the same eligibility checks, and `--sample-size`, `--min-per-stratum`, and
   `--sensitive-share` are ignored. Use the same `--seed` to keep the original
   opaque case IDs so existing labels still line up. `skipped` gains a
   `not_found` count for IDs that no longer exist, and `sampling` records
   `ids_requested`. Export after the catalog has been rehydrated (see the
   [worker runbook](jev-moderation-workers.md#revising-the-moderation-state-or-questions))
   so the states carry the new fields. An empty or malformed IDs file is
   rejected before the catalog is read.

   The output is `jev-moderation-candidates/v1`: unlabeled cases whose `state`
   is exactly the text production sends to Jev (the `q4` shape), plus
   `sampling_stratum` and `sensitive_candidate` fields. It also writes a private sidecar,
   `<output>.index.json`, mapping each case ID to a `ContentItem` ID.
   **The sidecar must never be committed or shared.** The candidate file
   contains catalog titles and descriptions, so keep both files outside the
   repository and out of issues, chat, and docs.
2. **Blind second-model silver labels.** Have a different model label every
   candidate's `state` for the three classes, without showing it Jev's
   output, the lexicon flag, or any other model's labels. These silver labels
   are working labels, not ground truth.
3. **One live Jev pass per case.** Threshold analysis needs the raw
   per-question probabilities, but [`evaluate_jev_moderation`](#exact-sample-preflight)
   reports only composed decisions and caps a run at 25 cases. The 2026-09-28
   run therefore used a one-off Core-shell script around the production
   `JevModerationClient` (zero SDK retries) with a pinned
   `MODERATION_MODEL=jev-1.13.0`. It appended one private JSONL row per case
   (opaque case ID, the three probabilities, returned model, token usage, and
   call-only duration) and skipped IDs already written, so a rerun never
   re-sent a completed case. Promote that script into a management command if
   catalog evaluations become recurring. The gold schema has no silver status,
   so do not feed silver labels to `evaluate_jev_moderation` as
   `human_adjudicated` cases.
4. **Human review.** A person reviews, from the private files: every case where
   the silver label and Jev's default-threshold decision disagree; every case
   both mark `explicit_or_sensitive` or `needs_review`; and a random 10% audit
   of the remaining safe/safe agreements, drawn with a recorded seed. The
   reviewer's label replaces the silver label. Unreviewed agreements keep the
   silver label, and the random audit estimates their error rate.
5. **Metrics.** Compute the metrics from the final labels and the stored
   probabilities, including a threshold sweep. Report the
   [classification metrics](#pure-classification-report-contract-jev-moderation-evaluation-reportv2)
   (Jev-only and final-policy confusion matrices, per-class precision and
   recall, explicit false-negative rate, needs-review recall, coverage, and
   provider/language strata with numerators and denominators), plus silver
   versus human agreement, latency, tokens, and priced cost. Fill in the
   [report summary template](#report-summary-template). Publish only opaque case
   IDs and aggregates, never titles, descriptions, or the sidecar.

### Report summary template

- Dataset schema/version, split, total cases, human-adjudicated cases:
- Concrete Jev version(s), mixed/unresolved models, single-version eligibility:
- Confusion matrices and Jev-only/final-policy class metrics (numerator / denominator):
- Explicit false-negative rate and needs-review recall, by outcome source:
- Jev-only vs final-policy needs-review, unknown, unavailable, and skipped coverage:
- Provider/language stratum case counts, metrics, and sparse `N/A` denominators:
- Caller-supplied latency p50 / p95 and missing duration count:
- Input/output token totals and missing-usage count:
- Input/output prices per million tokens and provenance:
- Known priced usage and complete cost total, with status:
- Provider overrides, separate from Jev-only quality:
- Go/no-go: human decision, with the evidence it rests on.

## Results: 2026-09-28 catalog evaluation

These results were measured under question revision `q3` and the v1 schema,
before provider safety metadata reached the state. They do not describe `q4`;
re-run the workflow under `q4` before relying on them.

**Sample.** 400 cases from the local development catalog (a copy of real
provider data), seed `denn-jev-eval-v1`, `--sample-size 400` with the other
exporter defaults. Strata: IGDB games 56, OpenLibrary books 18 (every eligible
book), Spotify albums 95, TMDB movies 77, TMDB seasons 101, TMDB TV shows 53;
98 cases were lexicon-enriched. The exporter skipped 1,286 identity-only items
without normalized detail and 14 states above 20,000 bytes. Languages (silver,
corrected by the reviewer where reviewed): English 322, Spanish 41, other 37.
No case had an affirmative TMDB adult flag, so every result below is Jev-only.

**Labels.** Five blind Sonnet annotators labeled every case under guideline
`silver-g1` (the three question categories above). One reviewer adjudicated
62 cases: 17 silver/Jev disagreements, 7 cases both flagged, and a 10% random
audit of 38 safe/safe agreements. The reviewer changed 8 of 62 silver labels;
the random audit found 0 of 38 errors, so the 338 unreviewed agreements keep
their silver label. Final labels: 390 safe, 6 explicit, 4 needs review.

**Jev `jev-1.13.0`, question revision `q3`, default thresholds 0.75/0.75/0.75.**

| Gold \ Jev | explicit | needs review | safe |
| --- | ---: | ---: | ---: |
| safe (390) | 1 | 8 | 381 |
| explicit (6) | 5 | 0 | 1 |
| needs review (4) | 0 | 4 | 0 |

- Explicit precision 5/6 (0.83) and recall 5/6 (0.83). All 6 explicit cases
  are TMDB movies (4) or IGDB games (2); albums, books, seasons and TV shows had
  none, so their explicit recall is `N/A`.
- Explicit-to-safe false negatives: 1/6. The missed case is a game whose title
  names pornography while its descriptive text is sparse; Jev returned
  `explicit_or_sensitive` = 0.08, so no reasonable threshold recovers it.
- User-visible false removals: 1/390 safe cases (0.26%) would be hidden from
  the homepage and blurred on detail: a classic film whose tagline names sexual
  violence (explicit probability 0.94). The other 8 safe-to-`needs_review`
  cases stay visible because `needs_review` has no surface effect in this
  release.
- Needs-review recall 4/4, precision 4/12. `needs_review` is not acted on
  today; it seeds the future admin review queue.
- Threshold sweep (`explicit_at` = `review_at`, `safe_min` 0.75): 0.60 through
  0.80 give the same explicit precision and recall (5/6, 5/6). Below 0.60,
  precision falls (0.50: 5/12). Above 0.80, recall falls (0.85: 3/6;
  0.90: 2/6). The defaults stay unchanged.
- Operations: 400/400 responses, 0 failures, all from `jev-1.13.0`.
  Call-only latency p50 205 ms, p95 260 ms, max 500 ms. Input tokens
  739,992 (mean 1,850, max 6,373). Cost USD 0.031 at USD 0.042 per million
  input tokens (output free), from the TypeSafe models page reviewed
  2026-09-28.

**Limits.** Explicit content is rare in this catalog (6 of 400 even with
enrichment), so the explicit metrics rest on very few cases and are not
stratum-level evidence. The labels come from one reviewer plus model silver
labels. Re-run this workflow when the model, question revision, or policy
changes.

**Go/no-go.** Recommended **GO** for activation with the default thresholds,
behind the rollout flags and the activation checklist in the
[worker runbook](jev-moderation-workers.md). Pending maintainer approval at
activation time.

### Results: 2026-09-28 q4 re-evaluation

Same 400 cases and labels as above (6 explicit, 4 needs review, 390 safe),
`jev-1.13.0`, local run, no live production data. Three states were compared:

| State | Explicit reaching the strict homepage | Safe hidden (of 390) | Explicit blurred (of 6) | Blur false positives |
| --- | ---: | ---: | ---: | ---: |
| `q3` (text only) | 1 | 9 | 5 | 1 |
| `q4` with certifications and age ratings | 0 | 25 | 4 | 2 |
| `q4` without certifications and age ratings | 0 | 21 | 4 | 2 |

Nearly all new false `needs_review`/`explicit` results were mainstream titles
whose only new signal was a mature rating. The shipped `q4` state therefore
omits certifications and age ratings (see ADR 0009). Six explicit cases make
this provisional; repeat the comparison with production data.
