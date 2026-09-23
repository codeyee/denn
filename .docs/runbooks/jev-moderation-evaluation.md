# Jev moderation evaluation data contract

This page defines the privacy-safe input contract for the offline JEV-006 evaluation. This slice adds schema validation only. Metrics, injected-client execution, and a report template remain open work. The committed fixture is synthetic and tests schema mechanics only; it is not evidence of Jev accuracy.

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
| `provider_explicit` | Exact boolean or null; true remains a provider policy override, not a gold label. |

Validation rejects extra/missing fields, duplicate or non-opaque case IDs, unknown content-specific state fields, URLs, credential-like strings, JWT-like text, wrong metadata, and non-text state values. It does not normalize classifier input. Never commit raw URLs, provider/external IDs, credentials, or unreviewed catalog text. See `core/content/moderation/evaluation_cases.py` for the executable schema.

## Sampling and evidence limits

JEV-006 targets 300–500 English/Spanish cases. A prior local aggregate found only 18 books and no reliable language field, so an equal-balanced cross-provider sample cannot be drawn from the local catalog. This schema and its synthetic fixture establish no representative sample and no model-quality result. Human-adjudicated sampling and metrics/report work remain open.
