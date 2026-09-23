"""Validate a bounded Jev evaluation before any live request can be made."""
from __future__ import annotations

import json
import os
import re
from argparse import ArgumentTypeError
from datetime import date
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from content.moderation.evaluation_accounting import build_accounting_summary
from content.moderation.evaluation_cases import CASE_ID_RE, load_gold_dataset
from content.moderation.questions import moderation_question_revision

_MODEL_ID_RE = re.compile(r"^jev-\d+\.\d+\.\d+$")
_REVISION_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
_PRICE_RE = re.compile(r"^\d+(?:\.\d+)?$")
_PROVENANCE_RE = re.compile(
    r"^typesafe-[a-z0-9_-]{1,32}-reviewed-\d{4}-\d{2}-\d{2}$"
)


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
        "Preflight an exact, bounded Jev evaluation without constructing a client "
        "or making network/database calls."
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
        parser.add_argument(
            "--dry-run", action="store_true", required=True,
            help="required preflight mode; this command makes no Jev call",
        )

    def handle(self, *args, **options):
        if not options["dry_run"]:
            raise CommandError("refusing to run without --dry-run preflight mode")
        case_ids = _case_ids(options["case_ids"])
        try:
            case_limit = _positive_int(options["limit"])
            input_price = _price(options["input_price_per_million_tokens"])
            output_price = _price(options["output_price_per_million_tokens"])
        except ArgumentTypeError as error:
            raise CommandError(str(error)) from error
        if len(case_ids) > case_limit:
            raise CommandError("selected case count exceeds --limit")

        try:
            cases = load_gold_dataset(options["dataset"])
        except (OSError, ValueError) as error:
            raise CommandError("gold-case dataset failed privacy/schema validation") from error
        by_id = {case["case_id"]: case for case in cases}
        if set(case_ids) - by_id.keys():
            raise CommandError("one or more requested case IDs are unknown")
        selected = tuple(by_id[case_id] for case_id in case_ids)
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
        ready = bool(_MODEL_ID_RE.fullmatch(model)) and (
            inference_candidates == 0 or (classifier_enabled and key_present)
        )
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
            "concrete_model_pinned": bool(_MODEL_ID_RE.fullmatch(model)),
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
