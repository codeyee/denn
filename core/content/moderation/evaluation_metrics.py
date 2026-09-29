"""Pure aggregation for offline Jev moderation evaluation records."""
from __future__ import annotations

import re
from collections import Counter
from collections.abc import Mapping, Sequence
from typing import Any

from .evaluation_accounting import build_accounting_summary
from .evaluation_cases import GOLD_CLASSES, validate_gold_dataset

REPORT_SCHEMA_VERSION = "jev-moderation-evaluation-report/v2"
PREDICTIONS = frozenset(GOLD_CLASSES) | {"unknown", "unavailable", "skipped"}
OBSERVATION_FIELDS = {
    "case_id", "jev_prediction", "policy_prediction", "inference_attempted",
    "response_received", "reported_model", "input_tokens", "output_tokens",
    "failure_code",
}
CASE_ID_RE = re.compile(r"^case_[a-f0-9]{12}$")
MODEL_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$")
CONCRETE_JEV_MODEL_RE = re.compile(r"^jev-\d+\.\d+(?:\.\d+)?$", re.I)
FAILURE_CODE_RE = re.compile(r"^[a-z][a-z0-9_]{0,47}$")


class EvaluationReportValidationError(ValueError):
    """Invalid aggregation input; observations must not silently drop cases."""


def _rate(numerator: int, denominator: int) -> dict[str, Any]:
    value = None if denominator == 0 else round(numerator / denominator, 6)
    return {
        "value": value,
        "display": "N/A" if value is None else f"{value * 100:.2f}%",
        "numerator": numerator,
        "denominator": denominator,
    }


def _matrix(rows: Sequence[dict[str, Any]], prediction_field: str) -> dict[str, dict[str, int]]:
    outcomes = tuple(GOLD_CLASSES) + ("unknown", "unavailable", "skipped")
    return {
        gold: {
            prediction: sum(
                row["gold_class"] == gold and row[prediction_field] == prediction
                for row in rows
            )
            for prediction in outcomes
        }
        for gold in GOLD_CLASSES
    }


def _has_provider_override(case: Mapping[str, Any]) -> bool:
    return (
        case["provider"] == "tmdb"
        and case["content_type"] in {"movie", "tv_show"}
        and case["provider_explicit"] is True
    )


def _coverage(rows: Sequence[dict[str, Any]], prediction_field: str) -> dict[str, Any]:
    total = len(rows)
    outcomes = tuple(GOLD_CLASSES) + ("unknown", "unavailable", "skipped")
    counts = {
        outcome: sum(row[prediction_field] == outcome for row in rows)
        for outcome in outcomes
    }
    return {
        "case_count": total,
        "outcome_counts": counts,
        "outcome_rates": {outcome: _rate(counts[outcome], total) for outcome in outcomes},
        "needs_review_abstention_rate": _rate(counts["needs_review"], total),
    }


def _quality_summary(
    rows: Sequence[dict[str, Any]], prediction_field: str,
) -> dict[str, Any]:
    matrix = _matrix(rows, prediction_field)
    per_class = {}
    for label in GOLD_CLASSES:
        true_positive = matrix[label][label]
        support = sum(matrix[label].values())
        predicted = sum(matrix[gold][label] for gold in GOLD_CLASSES)
        per_class[label] = {
            "true_positive": true_positive,
            "false_positive": predicted - true_positive,
            "false_negative": support - true_positive,
            "support": support,
            "precision": _rate(true_positive, predicted),
            "recall": _rate(true_positive, support),
        }
    explicit_support = sum(matrix["explicit_or_sensitive"].values())
    review_support = sum(matrix["needs_review"].values())
    return {
        "per_class": per_class,
        "explicit_false_negative_rate_gold_explicit_to_predicted_safe": _rate(
            matrix["explicit_or_sensitive"]["safe_for_automatic_discovery"], explicit_support
        ),
        "review_recall_gold_needs_review": _rate(
            matrix["needs_review"]["needs_review"], review_support
        ),
        "coverage": _coverage(rows, prediction_field),
    }


def _breakdown(rows: Sequence[dict[str, Any]], field: str) -> dict[str, Any]:
    keys = sorted({row[field] for row in rows})
    outcomes = tuple(GOLD_CLASSES) + ("unknown", "unavailable", "skipped")
    breakdown = {}
    for key in keys:
        group_rows = [row for row in rows if row[field] == key]
        breakdown[key] = {
            "case_count": len(group_rows),
            "gold_class_counts": {
                label: sum(row["gold_class"] == label for row in group_rows)
                for label in GOLD_CLASSES
            },
            "jev_prediction_counts": {
                label: sum(row["jev_prediction"] == label for row in group_rows)
                for label in outcomes
            },
            "final_policy_prediction_counts": {
                label: sum(row["policy_prediction"] == label for row in group_rows)
                for label in outcomes
            },
            "quality": {
                "jev_only": _quality_summary(group_rows, "jev_prediction"),
                "final_policy": _quality_summary(group_rows, "policy_prediction"),
            },
        }
    return breakdown


def _nonnegative_int(value: Any, path: str) -> int | None:
    if value is None:
        return None
    if type(value) is not int or value < 0:
        raise EvaluationReportValidationError(f"{path}: expected a non-negative integer or null")
    return value


def _validate_observations(
    cases: Sequence[dict[str, Any]], observations: Any,
) -> list[dict[str, Any]]:
    if not isinstance(observations, Sequence) or isinstance(observations, (str, bytes)):
        raise EvaluationReportValidationError("observations must be a sequence")
    case_by_id = {case["case_id"]: case for case in cases}
    normalized = []
    seen: set[str] = set()
    for index, observation in enumerate(observations):
        path = f"observations[{index}]"
        if not isinstance(observation, Mapping) or set(observation) != OBSERVATION_FIELDS:
            raise EvaluationReportValidationError(f"{path}: fields do not match the report contract")
        case_id = observation["case_id"]
        if not isinstance(case_id, str) or not CASE_ID_RE.fullmatch(case_id) or case_id not in case_by_id or case_id in seen:
            raise EvaluationReportValidationError(f"{path}.case_id: expected a unique dataset case ID")
        seen.add(case_id)
        attempted, received = observation["inference_attempted"], observation["response_received"]
        if type(attempted) is not bool or type(received) is not bool or received and not attempted:
            raise EvaluationReportValidationError(f"{path}: invalid inference/response state")
        prediction, policy = observation["jev_prediction"], observation["policy_prediction"]
        if not isinstance(prediction, str) or prediction not in PREDICTIONS:
            raise EvaluationReportValidationError(f"{path}.jev_prediction: unsupported outcome")
        if not isinstance(policy, str) or policy not in PREDICTIONS:
            raise EvaluationReportValidationError(f"{path}.policy_prediction: unsupported outcome")
        if (prediction == "skipped") != (not attempted):
            raise EvaluationReportValidationError(f"{path}: skipped outcome and inference state disagree")
        model = observation["reported_model"]
        if model is not None and (not isinstance(model, str) or not MODEL_ID_RE.fullmatch(model)):
            raise EvaluationReportValidationError(f"{path}.reported_model: expected a safe model identifier or null")
        input_tokens = _nonnegative_int(observation["input_tokens"], f"{path}.input_tokens")
        output_tokens = _nonnegative_int(observation["output_tokens"], f"{path}.output_tokens")
        if not received and (model is not None or input_tokens is not None or output_tokens is not None):
            raise EvaluationReportValidationError(f"{path}: model and usage require a received response")
        failure = observation["failure_code"]
        if failure is not None and (not isinstance(failure, str) or not FAILURE_CODE_RE.fullmatch(failure)):
            raise EvaluationReportValidationError(f"{path}.failure_code: use a safe code, never an error message")
        case = case_by_id[case_id]
        if _has_provider_override(case) and policy != "explicit_or_sensitive":
            raise EvaluationReportValidationError(
                f"{path}.policy_prediction: TMDB explicit override requires explicit_or_sensitive"
            )
        normalized.append({
            "case_id": case_id,
            "split": case["split"],
            "source_kind": case["source_kind"],
            "provider": case["provider"],
            "content_type": case["content_type"],
            "language": case["language"],
            "gold_class": case["gold_class"],
            "provider_explicit": case["provider_explicit"],
            "jev_prediction": prediction,
            "policy_prediction": policy,
            "inference_attempted": attempted,
            "response_received": received,
            "reported_model": model,
            "input_tokens": input_tokens,
            "output_tokens": output_tokens,
            "failure_code": failure,
        })
    if seen != set(case_by_id):
        raise EvaluationReportValidationError("one observation is required for every gold case, including failures")
    return normalized


def build_evaluation_report(
    dataset: Any,
    observations: Sequence[Mapping[str, Any]],
    *,
    durations_ms: Mapping[str, Any] | None = None,
    price_per_million_input_tokens: Any = None,
    price_per_million_output_tokens: Any = None,
    price_provenance: str | None = None,
) -> dict[str, Any]:
    """Aggregate a full offline report without clients, network, DB, or hidden thresholds."""
    cases = validate_gold_dataset(dataset)
    rows = _validate_observations(cases, observations)

    jev_matrix = _matrix(rows, "jev_prediction")
    policy_matrix = _matrix(rows, "policy_prediction")
    jev_quality = _quality_summary(rows, "jev_prediction")
    policy_quality = _quality_summary(rows, "policy_prediction")

    total = len(rows)
    responses = [row for row in rows if row["response_received"]]
    model_counts: Counter[str] = Counter()
    unresolved_models = 0
    for row in responses:
        model = row["reported_model"]
        if isinstance(model, str) and CONCRETE_JEV_MODEL_RE.fullmatch(model):
            model_counts[model] += 1
        else:
            unresolved_models += 1
    mixed_models = len(model_counts) > 1
    single_version_eligible = bool(responses and len(model_counts) == 1 and unresolved_models == 0)


    human_count = sum(case["adjudication"]["status"] == "human_adjudicated" for case in cases)
    synthetic_count = sum(case["source_kind"] == "synthetic_text" for case in cases)
    reasons = [
        "representative_human_adjudicated_live_sample_not_established",
        "representativeness_not_attested",
        "go_no_go_thresholds_not_supplied_or_approved",
    ]
    if not human_count:
        reasons.append("no_human_adjudicated_catalog_cases")
    if mixed_models:
        reasons.append("mixed_model_versions_are_ineligible_for_single_version_go_no_go")
    if unresolved_models:
        reasons.append("one_or_more_response_model_versions_are_unresolved")

    for row in rows:
        override = _has_provider_override(row)
        row["provider_override_applied"] = override
        row["provider_override_changed_prediction"] = (
            override and row["policy_prediction"] != row["jev_prediction"]
        )
    report = {
        "schema_version": REPORT_SCHEMA_VERSION,
        "go_no_go": {
            "status": "INSUFFICIENT",
            "reasons": reasons,
            "human_adjudicated_case_count": human_count,
            "synthetic_case_count": synthetic_count,
            "single_version_eligible": single_version_eligible,
        },
        "case_count": total,
        "confusion_matrix_jev_only": jev_matrix,
        "confusion_matrix_policy_including_provider_override": policy_matrix,
        "per_class_jev_only": jev_quality["per_class"],
        "per_class_final_policy": policy_quality["per_class"],
        "explicit_false_negative_rate_gold_explicit_to_predicted_safe": (
            jev_quality["explicit_false_negative_rate_gold_explicit_to_predicted_safe"]
        ),
        "explicit_false_negative_rate_final_policy_gold_explicit_to_predicted_safe": (
            policy_quality["explicit_false_negative_rate_gold_explicit_to_predicted_safe"]
        ),
        "review_recall_jev_only": jev_quality["review_recall_gold_needs_review"],
        "review_recall_final_policy": policy_quality["review_recall_gold_needs_review"],
        "coverage": {
            "total_case_count": total,
            "jev_only": jev_quality["coverage"],
            "final_policy": policy_quality["coverage"],
        },
        "provider_breakdown": _breakdown(rows, "provider"),
        "language_breakdown": _breakdown(rows, "language"),
        "model_consistency": {
            "resolved_model_counts": dict(sorted(model_counts.items())),
            "mixed_model_versions": mixed_models,
            "unresolved_response_model_count": unresolved_models,
            "single_version_eligible": single_version_eligible,
        },
        "cases": rows,
    }
    report.update(build_accounting_summary(
        rows,
        durations_ms=durations_ms,
        price_per_million_input_tokens=price_per_million_input_tokens,
        price_per_million_output_tokens=price_per_million_output_tokens,
        price_provenance=price_provenance,
    ))
    return report
