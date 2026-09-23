# Jev moderation evaluation data contract

This page defines the privacy-safe input contract and classification-report contract for the offline JEV-006 evaluation. Schema validation, classification metrics, and accounting are pure. The optional injected-client orchestrator makes no client construction, network, or database call of its own; it invokes only the supplied client's `classify` method. The committed fixture is synthetic and tests mechanics only; it is not evidence of Jev accuracy.

## Gold cases: `jev-moderation-gold-cases/v1`

A UTF-8 JSON dataset has only `schema_version` and `cases`. Each case has exactly:

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
| `provider_explicit` | Exact boolean or null; true is allowed only for TMDB movies/TV shows and is a policy override, not a gold label. |

Validation rejects extra/missing fields, duplicate or non-opaque case IDs, unknown content-specific state fields, URLs, credential-like strings, JWT-like text, wrong metadata, and non-text state values. It does not normalize classifier input. Never commit raw URLs, provider/external IDs, credentials, or unreviewed catalog text. See `core/content/moderation/evaluation_cases.py` for the executable schema.

## Sampling and evidence limits

JEV-006 targets 300–500 English/Spanish cases. A prior local aggregate found only 18 books and no reliable language field, so an equal-balanced cross-provider sample cannot be drawn from the local catalog. This schema, synthetic fixture, and computed classification metrics establish no representative sample and no model-quality result. Human-adjudicated sampling and injected-client execution remain open.


## Pure classification report contract: `jev-moderation-evaluation-report/v2`

`build_evaluation_report(dataset, observations)` accepts exactly one strict outcome record per gold case. It has no client, network, or database access. Jev-only and final-policy metrics are reported separately. Unknown, unavailable, skipped, and `needs_review` abstentions remain visible. All failures remain in their gold-class support and recall denominators. If `provider_explicit=true` for a TMDB movie/TV case, `policy_prediction` must be `explicit_or_sensitive`; an inconsistent outcome is rejected rather than reported as an applied override.

The report provides the class confusion matrices; Jev-only and final-policy per-class precision/recall; gold-explicit-to-predicted-safe false-negative rate; needs-review recall; and model-version consistency. It also provides per-provider and per-language quality summaries. Each stratum reports its case count, per-class true/false positives, false negatives and support, explicit false-negative rate, needs-review recall, and coverage. Every metric includes its numerator and denominator. A zero denominator returns `null` and displays `N/A`; the case count makes sparse strata visible without inventing a minimum-sample threshold. Provider overrides appear only in final-policy metrics, never as Jev model quality.

Coverage is calculated independently for `jev_only` and `final_policy`. Each `needs_review_abstention_rate` is `count(prediction == needs_review) / case_count`; each outcome rate uses the full case count in that report or stratum. Class recall is `true_positive / gold_class_support`, where support includes every case in that gold class, including unavailable, unknown, and skipped outcomes. Precision is `true_positive / count(predicted_class)`. The gold-explicit false-negative rate is `count(gold == explicit_or_sensitive and prediction == safe_for_automatic_discovery) / count(gold == explicit_or_sensitive)`. Needs-review recall is `count(gold == needs_review and prediction == needs_review) / count(gold == needs_review)`. These formulas apply separately to Jev-only and final-policy outcomes.

Record a concrete returned model such as `jev-1.13.0`. A moving alias such as `jev-latest`, a missing version, or mixed versions makes a single-version comparison ineligible. See the [TypeSafe model guidance](https://docs.typesafe.ai/models). The status remains `INSUFFICIENT`: metrics do not set pass thresholds or attest that the sample is representative.

The pure accounting function accepts optional caller-supplied per-case durations; its p50/p95 are not SDK latency. The injected orchestrator supplies wall time measured only around each `classify` invocation, excluding validation and aggregation; this includes adapter behavior and is not Jev-service-only latency. It keeps known input/output token totals and counts incomplete usage. Cost is reported only with price rates and a short price-provenance label; incomplete usage produces a partial known cost and a null complete total. Zero durations or token counts remain valid measurements; missing values are never replaced with zero.

## Injected execution

`content.moderation.evaluation_orchestration.evaluate_dataset` validates the complete dataset before selecting requested opaque case IDs. It returns the existing v2 aggregated report with an `evaluation_identity` containing the requested model, question revision, policy revision, and exact thresholds. The report rows contain only opaque IDs and classification/accounting fields, not the input state or raw error details.

Pass an already constructed `JevModerationClient` or a fake object with the same `classify(state)` contract. Tests inject a fake; this module does not construct `TypeSafeClient`. Each selected non-override case gets one evaluator-level `classify` invocation. Affirmative TMDB movie/TV cases follow production's hard override and make no invocation. Typed unavailable/skipped outcomes, malformed results, and generic client failures each keep their case in the report. The evaluator has no retry loop. The production adapter constructs TypeSafe with `RetryPolicy(max_retries=0)`, so one default adapter invocation permits at most one SDK wire attempt; injected custom clients may have their own retry behavior.

The returned `execution` section distinguishes selected cases, classify invocations, provider-override no-call cases, and evaluator retries. `latency_ms.source` describes the call-only measurement boundary. Use the fake client for offline checks; do not run the evaluator against a live Jev adapter without a separately approved live-sample plan. Synthetic results must not be used to infer model accuracy or set thresholds.


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
- Go/no-go: **INSUFFICIENT** until representative human-adjudicated live evidence and human-approved thresholds exist.
