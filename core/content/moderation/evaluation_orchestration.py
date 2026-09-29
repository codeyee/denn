"""Offline execution orchestration for Jev moderation evaluation cases."""
from __future__ import annotations

import math
import re
import time
from collections.abc import Mapping, Sequence
from typing import Any

from .client import JevModerationClient, ModerationJudgment
from .errors import ModerationSkipped, ModerationUnavailable
from .evaluation_accounting import build_accounting_summary
from .evaluation_cases import GOLD_SCHEMA_VERSION, validate_gold_dataset
from .evaluation_metrics import build_evaluation_report
from .policy import PolicyThresholds, compose_policy

POLICY_REVISION = "jev-moderation-policy/v1"
_IDENTITY_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$")
_REVISION_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
_FAILURE_CODE_RE = re.compile(r"^[a-z][a-z0-9_]{0,47}$")
_QUESTION_NAMES = frozenset({
    "safe_for_automatic_discovery",
    "explicit_or_sensitive",
    "needs_review",
})


def _validate_run_identity(
    requested_model: Any,
    question_revision: Any,
    thresholds: Any,
) -> PolicyThresholds:
    if not isinstance(requested_model, str) or not _IDENTITY_RE.fullmatch(requested_model):
        raise ValueError("requested_model must be a safe model identifier")
    if not isinstance(question_revision, str) or not _REVISION_RE.fullmatch(question_revision):
        raise ValueError("question_revision must be a safe revision identifier")
    if thresholds is None:
        return PolicyThresholds()
    if not isinstance(thresholds, PolicyThresholds):
        raise TypeError("thresholds must be a PolicyThresholds value or null")
    return thresholds


def _select_cases(cases: tuple[dict[str, Any], ...], selected_case_ids: Any):
    if selected_case_ids is None:
        return cases
    if not isinstance(selected_case_ids, Sequence) or isinstance(selected_case_ids, (str, bytes)):
        raise ValueError("selected_case_ids must be a sequence of opaque case IDs")
    requested = list(selected_case_ids)
    if any(not isinstance(case_id, str) for case_id in requested):
        raise ValueError("selected_case_ids must contain only opaque case IDs")
    if len(set(requested)) != len(requested):
        raise ValueError("selected_case_ids must not contain duplicates")
    by_id = {case["case_id"]: case for case in cases}
    unknown = set(requested) - set(by_id)
    if unknown:
        raise ValueError("selected_case_ids contains an ID outside the validated dataset")
    selected = set(requested)
    return tuple(case for case in cases if case["case_id"] in selected)


def _safe_failure_code(value: Any, fallback: str) -> str:
    if isinstance(value, str) and _FAILURE_CODE_RE.fullmatch(value):
        return value
    return fallback


def _token_count(value: Any) -> int | None:
    if type(value) is int and value >= 0:
        return value
    return None


def _missing_result(
    case: Mapping[str, Any],
    *,
    prediction: str,
    attempted: bool,
    failure_code: str | None,
    thresholds: PolicyThresholds,
) -> dict[str, Any]:
    policy_prediction = compose_policy(
        case["provider_explicit"], None, None, None, thresholds=thresholds,
    ).decision
    return {
        "case_id": case["case_id"],
        "jev_prediction": prediction,
        "policy_prediction": policy_prediction,
        "inference_attempted": attempted,
        "response_received": False,
        "reported_model": None,
        "input_tokens": None,
        "output_tokens": None,
        "failure_code": failure_code,
    }


def _judgment_result(
    case: Mapping[str, Any],
    result: Any,
    thresholds: PolicyThresholds,
) -> dict[str, Any]:
    if not isinstance(result, ModerationJudgment):
        return _missing_result(
            case,
            prediction="unavailable",
            attempted=True,
            failure_code="typesafe_response_invalid",
            thresholds=thresholds,
        )
    if not isinstance(result.nouls, Mapping) or set(result.nouls) != _QUESTION_NAMES:
        return _missing_result(
            case,
            prediction="unavailable",
            attempted=True,
            failure_code="typesafe_response_invalid",
            thresholds=thresholds,
        )

    values = result.nouls
    jev_prediction = compose_policy(
        None,
        values["safe_for_automatic_discovery"],
        values["explicit_or_sensitive"],
        values["needs_review"],
        thresholds=thresholds,
    ).decision
    policy_prediction = compose_policy(
        case["provider_explicit"],
        values["safe_for_automatic_discovery"],
        values["explicit_or_sensitive"],
        values["needs_review"],
        thresholds=thresholds,
    ).decision
    model = result.model if isinstance(result.model, str) and _IDENTITY_RE.fullmatch(result.model) else None
    usage = result.usage
    input_tokens = _token_count(getattr(usage, "input_tokens", None))
    output_tokens = _token_count(getattr(usage, "output_tokens", None))
    return {
        "case_id": case["case_id"],
        "jev_prediction": jev_prediction,
        "policy_prediction": policy_prediction,
        "inference_attempted": True,
        "response_received": True,
        "reported_model": model,
        "input_tokens": input_tokens,
        "output_tokens": output_tokens,
        "failure_code": None,
    }


def _classify_one(
    client: JevModerationClient,
    case: Mapping[str, Any],
    thresholds: PolicyThresholds,
) -> tuple[dict[str, Any], float]:
    start_ns = time.perf_counter_ns()
    try:
        try:
            result = client.classify(case["state"])
        except Exception as error:
            result = None
            call_error = error
        else:
            call_error = None
    finally:
        duration_ms = (time.perf_counter_ns() - start_ns) / 1_000_000
    if not math.isfinite(duration_ms) or duration_ms < 0:
        raise RuntimeError("monotonic clock returned an invalid duration")

    if isinstance(call_error, ModerationUnavailable):
        row = _missing_result(
            case,
            prediction="unavailable",
            attempted=True,
            failure_code=_safe_failure_code(call_error.code, "typesafe_api_error"),
            thresholds=thresholds,
        )
    elif call_error is not None:
        row = _missing_result(
            case,
            prediction="unavailable",
            attempted=True,
            failure_code="client_error",
            thresholds=thresholds,
        )
    elif isinstance(result, ModerationSkipped):
        row = _missing_result(
            case,
            prediction="skipped",
            attempted=False,
            failure_code=_safe_failure_code(result.code, "moderation_skipped"),
            thresholds=thresholds,
        )
    else:
        row = _judgment_result(case, result, thresholds)
    return row, round(duration_ms, 6)


def evaluate_dataset(
    dataset: Any,
    *,
    client: JevModerationClient,
    requested_model: str,
    question_revision: str,
    selected_case_ids: Sequence[str] | None = None,
    thresholds: PolicyThresholds | None = None,
    price_per_million_input_tokens: Any = None,
    price_per_million_output_tokens: Any = None,
    price_provenance: str | None = None,
) -> dict[str, Any]:
    """Evaluate validated cases through one injected classify invocation each.

    The adapter is not constructed here. The evaluator never retries; a client
    adapter may have its own transport retry behavior. Affirmative TMDB movie
    and TV overrides follow the production policy short-circuit and make no
    client invocation. Only time spent inside ``client.classify`` is measured.
    """
    cases = validate_gold_dataset(dataset)
    selected = _select_cases(cases, selected_case_ids)
    thresholds = _validate_run_identity(requested_model, question_revision, thresholds)
    if not callable(getattr(client, "classify", None)):
        raise TypeError("client must provide a callable classify method")

    # Reject invalid pricing metadata before any injected client can perform work.
    build_accounting_summary(
        [],
        durations_ms={},
        price_per_million_input_tokens=price_per_million_input_tokens,
        price_per_million_output_tokens=price_per_million_output_tokens,
        price_provenance=price_provenance,
    )

    observations = []
    durations_ms: dict[str, float] = {}
    provider_override_count = 0
    for case in selected:
        if case["provider_explicit"] is True:
            provider_override_count += 1
            observations.append(_missing_result(
                case,
                prediction="skipped",
                attempted=False,
                failure_code=None,
                thresholds=thresholds,
            ))
            continue
        row, duration_ms = _classify_one(client, case, thresholds)
        observations.append(row)
        durations_ms[case["case_id"]] = duration_ms

    report_dataset = {"schema_version": GOLD_SCHEMA_VERSION, "cases": list(selected)}
    report = build_evaluation_report(
        report_dataset,
        observations,
        durations_ms=durations_ms,
        price_per_million_input_tokens=price_per_million_input_tokens,
        price_per_million_output_tokens=price_per_million_output_tokens,
        price_provenance=price_provenance,
    )
    report["evaluation_identity"] = {
        "requested_model": requested_model,
        "question_revision": question_revision,
        "policy": {
            "name": "compose_policy",
            "revision": POLICY_REVISION,
            "thresholds": {
                "safe_min": thresholds.safe_min,
                "explicit_at": thresholds.explicit_at,
                "review_at": thresholds.review_at,
            },
        },
    }
    report["execution"] = {
        "selected_case_count": len(selected),
        "classify_invocation_count": len(durations_ms),
        "provider_override_no_call_count": provider_override_count,
        "evaluator_retry_count": 0,
        "retry_scope": "injected client transport retry behavior is not controlled here",
    }
    report["latency_ms"]["source"] = (
        "measured wall time around injected classify calls only; includes adapter behavior, "
        "excludes aggregation, and is not Jev service-only latency"
    )
    return report
