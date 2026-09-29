"""Validate a bounded Jev evaluation before any live request can be made."""
from __future__ import annotations

import json
import logging
import math
import os
import re
import time
from collections.abc import Mapping
from argparse import ArgumentTypeError
from contextlib import contextmanager
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from content.moderation.evaluation_accounting import build_accounting_summary
from content.moderation.evaluation_cases import CASE_ID_RE, GOLD_CLASSES, GOLD_SCHEMA_VERSION, load_gold_dataset
from content.moderation.evaluation_metrics import PREDICTIONS, REPORT_SCHEMA_VERSION
from content.moderation.questions import moderation_question_revision

_MODEL_ID_RE = re.compile(r"^jev-\d+\.\d+\.\d+$")
_REVISION_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
_PRICE_RE = re.compile(r"^\d+(?:\.\d+)?$")
_PROVENANCE_RE = re.compile(
    r"^typesafe-[a-z0-9_-]{1,32}-reviewed-\d{4}-\d{2}-\d{2}$"
)
_MAX_LIVE_CASES = 25
_MAX_LIVE_STATE_BYTES = 20_000
_REPORT_OUTCOMES = (*GOLD_CLASSES, "unknown", "unavailable", "skipped")
_REPORT_PROVIDERS = ("tmdb", "igdb", "spotify", "openlibrary")
_REPORT_LANGUAGES = ("en", "es", "other")
_GO_NO_GO_REASONS = frozenset({
    "representative_human_adjudicated_live_sample_not_established",
    "representativeness_not_attested",
    "go_no_go_thresholds_not_supplied_or_approved",
    "no_human_adjudicated_catalog_cases",
    "mixed_model_versions_are_ineligible_for_single_version_go_no_go",
    "one_or_more_response_model_versions_are_unresolved",
})
_OMIT = object()
_RATE = object()


def _map(allowed_keys, value_schema):
    return ("map", allowed_keys, value_schema)


def _list(value_schema):
    return ("list", value_schema)


_RATE_SCHEMA = {
    "value": "fraction_or_null",
    "numerator": "count",
    "denominator": "count",
}
_COUNTS_BY_CLASS = _map(GOLD_CLASSES, "count")
_COUNTS_BY_OUTCOME = _map(_REPORT_OUTCOMES, "count")
_MATRIX = _map(GOLD_CLASSES, _COUNTS_BY_OUTCOME)
_PER_CLASS = _map(GOLD_CLASSES, {
    "true_positive": "count",
    "false_positive": "count",
    "false_negative": "count",
    "support": "count",
    "precision": _RATE,
    "recall": _RATE,
})
_COVERAGE = {
    "case_count": "count",
    "outcome_counts": _COUNTS_BY_OUTCOME,
    "outcome_rates": _map(_REPORT_OUTCOMES, _RATE),
    "needs_review_abstention_rate": _RATE,
}
_QUALITY = {
    "per_class": _PER_CLASS,
    "explicit_false_negative_rate_gold_explicit_to_predicted_safe": _RATE,
    "review_recall_gold_needs_review": _RATE,
    "coverage": _COVERAGE,
}
_BREAKDOWN_ENTRY = {
    "case_count": "count",
    "gold_class_counts": _COUNTS_BY_CLASS,
    "jev_prediction_counts": _COUNTS_BY_OUTCOME,
    "final_policy_prediction_counts": _COUNTS_BY_OUTCOME,
    "quality": {"jev_only": _QUALITY, "final_policy": _QUALITY},
}
_TOKEN_TOTAL = {"known_total": "count", "reported_case_count": "count"}
_USAGE = {
    "inference_count": "count",
    "missing_usage_count": "count",
    "input_tokens": _TOKEN_TOTAL,
    "output_tokens": _TOKEN_TOTAL,
    "cost": {
        "input_price_per_million_tokens": "price_or_null",
        "output_price_per_million_tokens": "price_or_null",
        "price_provenance": "provenance_or_null",
        "known_usage_cost_usd": "price_or_null",
        "total_usd": "price_or_null",
        "status": "cost_status",
    },
}
_LIVE_REPORT_SCHEMA = {
    "go_no_go": {
        "reasons": _list("go_no_go_reason"),
        "human_adjudicated_case_count": "count",
        "synthetic_case_count": "count",
        "single_version_eligible": "bool",
    },
    "case_count": "count",
    "confusion_matrix_jev_only": _MATRIX,
    "confusion_matrix_policy_including_provider_override": _MATRIX,
    "per_class_jev_only": _PER_CLASS,
    "per_class_final_policy": _PER_CLASS,
    "explicit_false_negative_rate_gold_explicit_to_predicted_safe": _RATE,
    "explicit_false_negative_rate_final_policy_gold_explicit_to_predicted_safe": _RATE,
    "review_recall_jev_only": _RATE,
    "review_recall_final_policy": _RATE,
    "coverage": {
        "total_case_count": "count",
        "jev_only": _COVERAGE,
        "final_policy": _COVERAGE,
    },
    "provider_breakdown": _map(_REPORT_PROVIDERS, _BREAKDOWN_ENTRY),
    "language_breakdown": _map(_REPORT_LANGUAGES, _BREAKDOWN_ENTRY),
    "model_consistency": {
        "resolved_model_counts": _map("model_ids", "count"),
        "mixed_model_versions": "bool",
        "unresolved_response_model_count": "count",
        "single_version_eligible": "bool",
    },
    "latency_ms": {
        "supplied_count": "count",
        "missing_count": "count",
        "p50": "nonnegative_number_or_null",
        "p95": "nonnegative_number_or_null",
    },
    "usage": _USAGE,
    "evaluation_identity": {
        "requested_model": "model_id",
        "question_revision": "revision",
        "policy": {
            "name": "policy_name",
            "revision": "revision",
            "thresholds": {
                "safe_min": "fraction",
                "explicit_at": "fraction",
                "review_at": "fraction",
            },
        },
    },
    "execution": {
        "selected_case_count": "count",
        "classify_invocation_count": "count",
        "provider_override_no_call_count": "count",
        "evaluator_retry_count": "count",
    },
    "cases": _list({
        "case_id": "case_id",
        "gold_class": "gold_class",
        "jev_prediction": "prediction",
        "policy_prediction": "prediction",
        "inference_attempted": "bool",
        "response_received": "bool",
        "reported_model": "model_id_or_null",
        "input_tokens": "count_or_null",
        "output_tokens": "count_or_null",
        "failure_code": "failure_code_or_null",
        "provider_override_applied": "bool",
        "provider_override_changed_prediction": "bool",
    }),
}


@contextmanager
def _suppress_typesafe_sdk_logs():
    """Prevent the SDK DEBUG wire logger from exposing request/response bodies."""
    logger = logging.getLogger("typesafe_sdk")
    was_disabled = logger.disabled
    logger.disabled = True
    try:
        yield
    finally:
        logger.disabled = was_disabled


def _project(value: Any, schema: Any) -> Any:
    """Project one report node through an explicit schema and strict scalar types."""
    if schema is _RATE:
        if not isinstance(value, Mapping):
            return _OMIT
        result = _project(value, _RATE_SCHEMA)
        if result is _OMIT or any(field not in result for field in _RATE_SCHEMA):
            return _OMIT
        result["display"] = "N/A" if result["value"] is None else f"{result['value'] * 100:.2f}%"
        return result
    if isinstance(schema, dict):
        if not isinstance(value, Mapping):
            return _OMIT
        return {
            field: projected for field, field_schema in schema.items()
            if field in value and (projected := _project(value[field], field_schema)) is not _OMIT
        }
    if isinstance(schema, tuple) and schema[0] == "map":
        if not isinstance(value, Mapping):
            return _OMIT
        allowed, child_schema = schema[1:]
        return {
            key: projected for key, raw in value.items()
            if isinstance(key, str)
            and ((allowed == "model_ids" and _MODEL_ID_RE.fullmatch(key)) or (allowed != "model_ids" and key in allowed))
            and (projected := _project(raw, child_schema)) is not _OMIT
        }
    if isinstance(schema, tuple) and schema[0] == "list":
        if not isinstance(value, (list, tuple)):
            return _OMIT
        return [projected for raw in value if (projected := _project(raw, schema[1])) is not _OMIT]
    if schema == "count":
        return value if type(value) is int and value >= 0 else _OMIT
    if schema in {"fraction", "fraction_or_null"}:
        if schema == "fraction_or_null" and value is None:
            return None
        return value if type(value) in (int, float) and math.isfinite(value) and 0 <= value <= 1 else _OMIT
    if schema == "nonnegative_number_or_null":
        if value is None:
            return None
        return value if type(value) in (int, float) and math.isfinite(value) and value >= 0 else _OMIT
    if schema == "count_or_null":
        return None if value is None else value if type(value) is int and value >= 0 else _OMIT
    if schema in {"bool", "policy_name", "cost_status", "go_no_go_reason", "gold_class", "prediction", "case_id", "model_id", "model_id_or_null", "revision", "failure_code_or_null", "price_or_null", "provenance_or_null"}:
        if schema in {"bool"}:
            return value if type(value) is bool else _OMIT
        if schema == "policy_name":
            return value if value == "compose_policy" else _OMIT
        if schema == "cost_status":
            return value if value in {"complete", "incomplete_usage", "no_inference_usage", "not_priced", "missing_price_rate"} else _OMIT
        if schema == "go_no_go_reason":
            return value if isinstance(value, str) and value in _GO_NO_GO_REASONS else _OMIT
        if schema == "gold_class":
            return value if isinstance(value, str) and value in GOLD_CLASSES else _OMIT
        if schema == "prediction":
            return value if isinstance(value, str) and value in PREDICTIONS else _OMIT
        if schema == "case_id":
            return value if isinstance(value, str) and CASE_ID_RE.fullmatch(value) else _OMIT
        if schema in {"model_id", "model_id_or_null"}:
            return None if schema == "model_id_or_null" and value is None else value if isinstance(value, str) and _MODEL_ID_RE.fullmatch(value) else _OMIT
        if schema == "revision":
            return value if isinstance(value, str) and _REVISION_RE.fullmatch(value) else _OMIT
        if schema == "failure_code_or_null":
            return None if value is None else value if isinstance(value, str) and re.fullmatch(r"^[a-z][a-z0-9_]{0,47}$", value) else _OMIT
        if schema == "price_or_null":
            if value is None:
                return None
            if not isinstance(value, str) or len(value) > 64 or not _PRICE_RE.fullmatch(value):
                return _OMIT
            try:
                price = Decimal(value)
            except InvalidOperation:
                return _OMIT
            return value if price.is_finite() and price >= 0 else _OMIT
        if schema == "provenance_or_null":
            return None if value is None else value if isinstance(value, str) and _PROVENANCE_RE.fullmatch(value) else _OMIT
    return _OMIT


def _safe_live_report(report: dict[str, Any]) -> dict[str, Any]:
    """Project every report object through its allowlisted schema; never pass nested data through."""
    projected: dict[str, Any] = {"schema_version": REPORT_SCHEMA_VERSION}
    if not isinstance(report, Mapping):
        return {**projected, "cases": []}
    for field, schema in _LIVE_REPORT_SCHEMA.items():
        if field not in report:
            continue
        value = _project(report[field], schema)
        if value is not _OMIT:
            projected[field] = value
    if "go_no_go" in projected:
        projected["go_no_go"]["status"] = "INSUFFICIENT"
    if "execution" in projected:
        projected["execution"]["retry_scope"] = (
            "production TypeSafe adapter retries disabled; evaluator retries disabled"
        )
    if "latency_ms" in projected:
        projected["latency_ms"]["source"] = (
            "measured wall time around injected classify calls only; includes adapter behavior, "
            "excludes aggregation, and is not Jev service-only latency"
        )
    if "usage" in projected and "cost" in projected["usage"]:
        projected["usage"]["cost"]["currency"] = "USD"
    if "cases" not in projected:
        projected["cases"] = []
    else:
        projected["cases"] = [
            case for case in projected["cases"] if isinstance(case, dict) and "case_id" in case
        ]
    return projected


def _positive_int(raw: Any) -> int:
    if type(raw) is int:
        value = raw
    elif isinstance(raw, str) and raw and raw.isascii() and raw.isdecimal():
        value = int(raw)
    else:
        raise ArgumentTypeError("must be a positive ASCII integer")
    if value <= 0:
        raise ArgumentTypeError("must be a positive ASCII integer")
    return value


def _case_ids(raw: Any) -> tuple[str, ...]:
    if not isinstance(raw, str) or not raw.strip():
        raise CommandError("at least one explicit --case-ids value is required")
    tokens = [token.strip() for token in raw.split(",")]
    if any(not token or not CASE_ID_RE.fullmatch(token) for token in tokens):
        raise CommandError("--case-ids must contain only opaque case_<12 lowercase hex> IDs")
    if len(set(tokens)) != len(tokens):
        raise CommandError("duplicate --case-ids values are not allowed")
    return tuple(tokens)


def _price(raw: Any) -> Decimal:
    if isinstance(raw, Decimal):
        value = raw
    elif isinstance(raw, str) and _PRICE_RE.fullmatch(raw):
        try:
            value = Decimal(raw)
        except InvalidOperation as error:
            raise ArgumentTypeError("must be a finite non-negative decimal") from error
    else:
        raise ArgumentTypeError("must be a finite non-negative decimal without a sign")
    if not value.is_finite() or value < 0:
        raise ArgumentTypeError("must be a finite non-negative decimal")
    return value


def _price_provenance(raw: Any) -> str:
    if not isinstance(raw, str) or not _PROVENANCE_RE.fullmatch(raw):
        raise CommandError(
            "use a dated label such as typesafe-models-reviewed-2026-09-23"
        )
    try:
        date.fromisoformat(raw.rsplit("-reviewed-", 1)[1])
    except ValueError as error:
        raise CommandError("pricing review date must be a valid YYYY-MM-DD") from error
    return raw


class Command(BaseCommand):
    help = (
        "Preflight or explicitly run a bounded Jev moderation evaluation without "
        "database access."
    )

    def add_arguments(self, parser):
        parser.add_argument("--dataset", required=True, help="local gold-case JSON file")
        parser.add_argument(
            "--case-ids", required=True, metavar="CASE_ID[,CASE_ID...]",
            help="exact comma-separated list of opaque case IDs; no sampling",
        )
        parser.add_argument("--limit", type=_positive_int, required=True)
        parser.add_argument("--input-price-per-million-tokens", type=_price, required=True)
        parser.add_argument("--output-price-per-million-tokens", type=_price, required=True)
        parser.add_argument("--price-provenance", required=True)
        modes = parser.add_mutually_exclusive_group(required=True)
        modes.add_argument(
            "--dry-run", action="store_true",
            help="validate inputs and readiness without constructing a client",
        )
        modes.add_argument(
            "--confirm-live", action="store_true",
            help="send the exact selected cases to the configured pinned Jev model",
        )

    def handle(self, *args, **options):
        if options["dry_run"] == options["confirm_live"]:
            raise CommandError("choose exactly one of --dry-run or --confirm-live")
        case_ids = _case_ids(options["case_ids"])
        try:
            case_limit = _positive_int(options["limit"])
            input_price = _price(options["input_price_per_million_tokens"])
            output_price = _price(options["output_price_per_million_tokens"])
        except ArgumentTypeError as error:
            raise CommandError(str(error)) from error
        if len(case_ids) > case_limit:
            raise CommandError("selected case count exceeds --limit")
        if case_limit > _MAX_LIVE_CASES:
            raise CommandError(f"--limit must not exceed {_MAX_LIVE_CASES}")

        try:
            cases = load_gold_dataset(options["dataset"])
        except (OSError, ValueError) as error:
            raise CommandError("gold-case dataset failed privacy/schema validation") from error
        by_id = {case["case_id"]: case for case in cases}
        if set(case_ids) - by_id.keys():
            raise CommandError("one or more requested case IDs are unknown")
        selected = tuple(by_id[case_id] for case_id in case_ids)
        if any(
            len(json.dumps(case["state"], ensure_ascii=False).encode("utf-8"))
            > _MAX_LIVE_STATE_BYTES
            for case in selected
        ):
            raise CommandError(
                f"each selected state must be at most {_MAX_LIVE_STATE_BYTES} UTF-8 bytes"
            )
        provenance = _price_provenance(options["price_provenance"])

        try:
            build_accounting_summary(
                [],
                price_per_million_input_tokens=input_price,
                price_per_million_output_tokens=output_price,
                price_provenance=provenance,
            )
        except ValueError as error:
            raise CommandError("pricing snapshot failed validation") from error

        model = getattr(settings, "MODERATION_MODEL", None)
        if not isinstance(model, str) or not re.fullmatch(
            r"[A-Za-z0-9][A-Za-z0-9._+-]{0,63}", model
        ):
            raise CommandError("MODERATION_MODEL must be a safe TypeSafe model identifier")
        question_revision = moderation_question_revision()
        if not isinstance(question_revision, str) or not _REVISION_RE.fullmatch(question_revision):
            raise CommandError("MODERATION_QUESTION_REVISION must be a safe revision identifier")

        classifier_enabled = getattr(settings, "MODERATION_CLASSIFICATION_ENABLED", False) is True
        key_present = bool(os.environ.get("TYPESAFE_API_KEY", "").strip())
        inference_candidates = sum(case["provider_explicit"] is not True for case in selected)
        pinned_model = bool(_MODEL_ID_RE.fullmatch(model))
        ready = pinned_model and (
            inference_candidates == 0 or (classifier_enabled and key_present)
        )
        if options["dry_run"]:
            self.stdout.write(json.dumps({
                "event": "jev_moderation_live_evaluation_preflight",
                "live_call_performed": False,
                "database_reads": 0,
                "database_writes": 0,
                "case_ids": list(case_ids),
                "selected_case_count": len(selected),
                "maximum_case_limit": case_limit,
                "maximum_inference_calls": inference_candidates,
                "requested_model": model,
                "concrete_model_pinned": pinned_model,
                "question_revision": question_revision,
                "classifier_enabled": classifier_enabled,
                "api_key_present": key_present,
                "ready_for_live_run": ready,
                "pricing_snapshot": {
                    "currency": "USD",
                    "input_price_per_million_tokens": str(input_price),
                    "output_price_per_million_tokens": str(output_price),
                    "provenance": provenance,
                    "cost_cap_enforced": False,
                },
            }, sort_keys=True, separators=(",", ":")))
            return

        if not pinned_model:
            raise CommandError("live evaluation requires a concrete pinned MODERATION_MODEL")
        if inference_candidates and not classifier_enabled:
            raise CommandError(
                'live evaluation requires MODERATION_CLASSIFICATION_ENABLED=True '
                '(set the environment value to the exact case-sensitive string "True")'
            )
        if inference_candidates and not key_present:
            raise CommandError("live evaluation requires TYPESAFE_API_KEY to be configured")

        # Imports and construction remain behind the complete local preflight.
        from content.moderation.client import JevModerationClient
        from content.moderation.evaluation_orchestration import evaluate_dataset

        started_ns = time.perf_counter_ns()
        try:
            with _suppress_typesafe_sdk_logs():
                client = JevModerationClient(model=model)
                report = evaluate_dataset(
                    {"schema_version": GOLD_SCHEMA_VERSION, "cases": list(cases)},
                    client=client,
                    requested_model=model,
                    question_revision=question_revision,
                    selected_case_ids=case_ids,
                    price_per_million_input_tokens=input_price,
                    price_per_million_output_tokens=output_price,
                    price_provenance=provenance,
                )
        except Exception:
            raise CommandError(
                "live evaluation failed; calls may already have been sent, so do not rerun blindly"
            ) from None
        elapsed_ms = round((time.perf_counter_ns() - started_ns) / 1_000_000, 3)
        execution = report["execution"]
        self.stdout.write(json.dumps({
            "event": "jev_moderation_live_evaluation_report",
            "live_call_performed": execution["classify_invocation_count"] > 0,
            "database_reads": 0,
            "database_writes": 0,
            "case_ids": list(case_ids),
            "selected_case_count": len(selected),
            "requested_model": model,
            "question_revision": question_revision,
            "elapsed_ms": elapsed_ms,
            "max_live_case_count": _MAX_LIVE_CASES,
            "max_state_bytes": _MAX_LIVE_STATE_BYTES,
            "max_sdk_retries": 0,
            "evaluator_retries": 0,
            "cost_cap_enforced": False,
            "report": _safe_live_report(report),
        }, sort_keys=True, separators=(",", ":")))
