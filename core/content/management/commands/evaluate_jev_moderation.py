"""Validate a bounded Jev evaluation before any live request can be made."""
from __future__ import annotations

import json
import logging
import os
import re
import time
from argparse import ArgumentTypeError
from contextlib import contextmanager
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from content.moderation.evaluation_accounting import build_accounting_summary
from content.moderation.evaluation_cases import CASE_ID_RE, GOLD_SCHEMA_VERSION, load_gold_dataset
from content.moderation.questions import moderation_question_revision

_MODEL_ID_RE = re.compile(r"^jev-\d+\.\d+\.\d+$")
_REVISION_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
_PRICE_RE = re.compile(r"^\d+(?:\.\d+)?$")
_PROVENANCE_RE = re.compile(
    r"^typesafe-[a-z0-9_-]{1,32}-reviewed-\d{4}-\d{2}-\d{2}$"
)
_MAX_LIVE_CASES = 25
_MAX_LIVE_STATE_BYTES = 20_000
_SAFE_REPORT_FIELDS = (
    "go_no_go", "case_count", "confusion_matrix_jev_only",
    "confusion_matrix_policy_including_provider_override", "per_class_jev_only",
    "per_class_final_policy", "explicit_false_negative_rate_gold_explicit_to_predicted_safe",
    "explicit_false_negative_rate_final_policy_gold_explicit_to_predicted_safe",
    "review_recall_jev_only", "review_recall_final_policy", "coverage",
    "provider_breakdown", "language_breakdown", "model_consistency", "latency_ms",
    "usage", "evaluation_identity", "execution",
)
_SAFE_CASE_FIELDS = (
    "case_id", "gold_class", "jev_prediction", "policy_prediction",
    "inference_attempted", "response_received", "reported_model", "input_tokens",
    "output_tokens", "failure_code", "provider_override_applied",
    "provider_override_changed_prediction",
)


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


def _safe_live_report(report: dict[str, Any]) -> dict[str, Any]:
    """Project the evaluator result onto stable metrics and opaque case outcomes."""
    projected = {field: report[field] for field in _SAFE_REPORT_FIELDS if field in report}
    execution = projected.get("execution")
    if isinstance(execution, dict):
        execution["retry_scope"] = (
            "production TypeSafe adapter retries disabled; evaluator retries disabled"
        )
    projected["cases"] = [
        {field: case[field] for field in _SAFE_CASE_FIELDS if field in case}
        for case in report.get("cases", [])
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
            raise CommandError("live evaluation requires MODERATION_CLASSIFICATION_ENABLED=true")
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
