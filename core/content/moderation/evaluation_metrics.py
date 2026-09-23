"""Pure aggregation for offline Jev moderation evaluation records."""
from __future__ import annotations

import re
from collections import Counter
from collections.abc import Mapping, Sequence
from typing import Any

from .evaluation_cases import GOLD_CLASSES, validate_gold_dataset

REPORT_SCHEMA_VERSION = "jev-moderation-evaluation-report/v1"
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


def _breakdown(rows: Sequence[dict[str, Any]], field: str) -> dict[str, Any]:
    keys = sorted({row[field] for row in rows})
    outcomes = tuple(GOLD_CLASSES) + ("unknown", "unavailable", "skipped")
    return {
        key: {
            "case_count": sum(row[field] == key for row in rows),
            "gold_class_counts": {
                label: sum(row[field] == key and row["gold_class"] == label for row in rows)
                for label in GOLD_CLASSES
            },
            "jev_prediction_counts": {
                label: sum(row[field] == key and row["jev_prediction"] == label for row in rows)
                for label in outcomes
            },
        }
        for key in keys
    }


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
) -> dict[str, Any]:
    """Aggregate classification results without clients, network, DB, or hidden thresholds."""
    cases = validate_gold_dataset(dataset)
    rows = _validate_observations(cases, observations)

    jev_matrix = _matrix(rows, "jev_prediction")
    policy_matrix = _matrix(rows, "policy_prediction")
    per_class = {}
    for label in GOLD_CLASSES:
        true_positive = jev_matrix[label][label]
        support = sum(jev_matrix[label].values())
        predicted = sum(jev_matrix[gold][label] for gold in GOLD_CLASSES)
        per_class[label] = {
            "true_positive": true_positive,
            "false_positive": predicted - true_positive,
            "false_negative": support - true_positive,
            "support": support,
            "precision": _rate(true_positive, predicted),
            "recall": _rate(true_positive, support),
        }

    total = len(rows)
    outcomes = tuple(GOLD_CLASSES) + ("unknown", "unavailable", "skipped")
    counts = {label: sum(row["jev_prediction"] == label for row in rows) for label in outcomes}
    explicit_support = sum(jev_matrix["explicit_or_sensitive"].values())
    review_support = sum(jev_matrix["needs_review"].values())
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
        override = (
            row["provider"] == "tmdb"
            and row["content_type"] in {"movie", "tv_show"}
            and row["provider_explicit"] is True
        )
        row["provider_override_applied"] = override
        row["provider_override_changed_prediction"] = (
            override and row["policy_prediction"] != row["jev_prediction"]
        )
    return {
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
        "per_class_jev_only": per_class,
        "explicit_false_negative_rate_gold_explicit_to_predicted_safe": _rate(
            jev_matrix["explicit_or_sensitive"]["safe_for_automatic_discovery"], explicit_support
        ),
        "review_recall_jev_only": _rate(jev_matrix["needs_review"]["needs_review"], review_support),
        "coverage": {
            "total_cases": total,
            "counts": counts,
            "rates": {
                "abstention_needs_review": _rate(counts["needs_review"], total),
                "unknown": _rate(counts["unknown"], total),
                "unavailable": _rate(counts["unavailable"], total),
                "skipped": _rate(counts["skipped"], total),
            },
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
