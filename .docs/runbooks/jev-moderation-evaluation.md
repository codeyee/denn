# Jev moderation evaluation data contract

This page defines the privacy-safe input contract and classification-report contract for the offline JEV-006 evaluation. The schema, classification metrics, and accounting summaries are pure: they make no Jev client, network, or database call. The committed fixture is synthetic and tests mechanics only; it is not evidence of Jev accuracy. Injected-client execution remains a separate open slice.

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


## Pure classification report contract

`build_evaluation_report(dataset, observations)` accepts exactly one strict outcome record per gold case. It has no client, network, or database access. Jev-only and final policy outcomes are reported separately. Unknown, unavailable, skipped, and `needs_review` abstentions remain visible. All failures remain in their gold-class support and recall denominators.

The report provides the class confusion matrices, per-class precision/recall with numerators and denominators, gold-explicit-to-predicted-safe false-negative rate, review recall, provider/language breakdowns with counts, and model-version consistency. Provider overrides appear only in the policy matrix and per-case flags, never in Jev-only quality metrics. Zero denominators have value `null` and display `N/A`. Raw state text and exception messages do not appear in report rows.

Record a concrete returned model such as `jev-1.13.0`. A moving alias such as `jev-latest`, a missing version, or mixed versions makes a single-version comparison ineligible. See the [TypeSafe model guidance](https://docs.typesafe.ai/models). The status remains `INSUFFICIENT`: metrics do not set pass thresholds or attest that the sample is representative.

The accounting section uses optional caller-supplied per-case durations; its p50/p95 are not SDK latency. It keeps known input/output token totals and counts incomplete usage. Cost is reported only with price rates and a short price-provenance label; incomplete usage produces a partial known cost and a null complete total. Zero durations or token counts remain valid measurements; missing values are never replaced with zero.


### Report summary template

- Dataset schema/version, split, total cases, human-adjudicated cases:
- Concrete Jev version(s), mixed/unresolved models, single-version eligibility:
- Confusion matrices and per-class supports, precision, and recall (numerator / denominator):
- Explicit false-negative rate and review recall:
- Abstention, unknown, unavailable, and skipped coverage:
- Provider and manual-language counts:
- Caller-supplied latency p50 / p95 and missing duration count:
- Input/output token totals and missing-usage count:
- Input/output prices per million tokens and provenance:
- Known priced usage and complete cost total, with status:
- Provider overrides, separate from Jev-only quality:
- Go/no-go: **INSUFFICIENT** until representative human-adjudicated live evidence and human-approved thresholds exist.
