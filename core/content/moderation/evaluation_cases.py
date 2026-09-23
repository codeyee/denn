"""Versioned, privacy-safe Jev moderation gold-case schema."""
from __future__ import annotations

import json
import re
from collections.abc import Mapping
from copy import deepcopy
from pathlib import Path
from typing import Any

GOLD_SCHEMA_VERSION = "jev-moderation-gold-cases/v1"
CASE_FIELDS = {
    "case_id", "split", "source_kind", "provider", "content_type", "language",
    "state", "gold_class", "adjudication", "provider_explicit",
}
STATE_FIELDS = {"provider", "content_type", "title", "description", "type_specific"}
ADJUDICATION_FIELDS = {"status", "reviewer_count", "guideline_revision"}
CONTENT_TYPES = {"movie", "tv_show", "season", "game", "album", "book"}
GOLD_CLASSES = {"safe_for_automatic_discovery", "explicit_or_sensitive", "needs_review"}
CASE_ID_RE = re.compile(r"^case_[a-f0-9]{12}$")
SLUG_RE = re.compile(r"^[a-z][a-z0-9_-]{0,31}$")
GUIDELINE_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$")
URL_RE = re.compile(r"(?:https?://|www\.)", re.I)
SECRET_RE = re.compile(
    r"\b(?:api[_ -]?key|access[_ -]?token|client[_ -]?secret|password|bearer)"
    r"\b\s*(?:[:=]\s*\S+|\s+\S{8,})",
    re.I,
)
JWT_RE = re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b")

# These shapes mirror the text-only object built by moderation.state.
TYPE_SPECIFIC_SHAPES = {
    "movie": {"movie": {"original_title": str, "tagline": str}},
    "tv_show": {"tv_show": {"original_title": str, "tagline": str}},
    "game": {"game": {
        "genres": [str], "themes": [str], "game_modes": [str],
        "game_type": str, "series": str,
    }},
    "season": {"season": {
        "parent_show_name": str,
        "episodes": [{"title": str, "description": str}],
    }},
    "album": {"album": {
        "artists": [str],
        "tracks": [{"title": str, "credits": [{"name": str, "role": str}]}],
    }},
    "book": {"book": {"authors": [str]}},
}


class GoldCaseValidationError(ValueError):
    """A gold-case document is invalid or contains privacy-unsafe fields."""


def _require_fields(value: Any, fields: set[str], path: str) -> Mapping[str, Any]:
    if not isinstance(value, Mapping) or set(value) != fields:
        raise GoldCaseValidationError(f"{path}: object fields do not match the v1 schema")
    return value


def _validate_shape(value: Any, shape: Any, path: str) -> None:
    if shape is str:
        if not isinstance(value, str):
            raise GoldCaseValidationError(f"{path}: expected text")
        if URL_RE.search(value) or SECRET_RE.search(value) or JWT_RE.search(value):
            raise GoldCaseValidationError(f"{path}: URL or credential-like text is prohibited")
        return
    if isinstance(shape, list):
        if not isinstance(value, list):
            raise GoldCaseValidationError(f"{path}: expected a list")
        for index, entry in enumerate(value):
            _validate_shape(entry, shape[0], f"{path}[{index}]")
        return
    if isinstance(shape, dict):
        fields = _require_fields(value, set(shape), path)
        for name, field_shape in shape.items():
            _validate_shape(fields[name], field_shape, f"{path}.{name}")
        return
    raise AssertionError("unsupported internal schema shape")


def validate_gold_dataset(document: Any) -> tuple[dict[str, Any], ...]:
    """Validate and copy a v1 document without altering classifier state."""
    document = _require_fields(document, {"schema_version", "cases"}, "dataset")
    if document["schema_version"] != GOLD_SCHEMA_VERSION or not isinstance(document["cases"], list):
        raise GoldCaseValidationError("dataset: unsupported version or invalid cases list")

    seen: set[str] = set()
    cases = []
    for index, raw in enumerate(document["cases"]):
        path = f"cases[{index}]"
        case = _require_fields(raw, CASE_FIELDS, path)
        case_id = case["case_id"]
        if not isinstance(case_id, str) or not CASE_ID_RE.fullmatch(case_id) or case_id in seen:
            raise GoldCaseValidationError(f"{path}.case_id: expected a unique opaque case ID")
        seen.add(case_id)
        if not isinstance(case["split"], str) or case["split"] not in {"development", "evaluation", "holdout"}:
            raise GoldCaseValidationError(f"{path}.split: unsupported split")
        if not isinstance(case["source_kind"], str) or case["source_kind"] not in {"synthetic_text", "catalog_text"}:
            raise GoldCaseValidationError(f"{path}.source_kind: unsupported source kind")
        if not isinstance(case["provider"], str) or not SLUG_RE.fullmatch(case["provider"]):
            raise GoldCaseValidationError(f"{path}.provider: expected a lowercase slug")
        content_type = case["content_type"]
        if not isinstance(content_type, str) or content_type not in CONTENT_TYPES:
            raise GoldCaseValidationError(f"{path}.content_type: unsupported content type")
        if not isinstance(case["language"], str) or case["language"] not in {"en", "es", "other"}:
            raise GoldCaseValidationError(f"{path}.language: expected a manual language label")
        if not isinstance(case["gold_class"], str) or case["gold_class"] not in GOLD_CLASSES:
            raise GoldCaseValidationError(f"{path}.gold_class: unsupported class")
        if case["provider_explicit"] is not None and type(case["provider_explicit"]) is not bool:
            raise GoldCaseValidationError(f"{path}.provider_explicit: expected bool or null")

        state = _require_fields(case["state"], STATE_FIELDS, f"{path}.state")
        if state["provider"] != case["provider"] or state["content_type"] != content_type.upper():
            raise GoldCaseValidationError(f"{path}.state: provider/content type mismatch")
        _validate_shape(state["title"], str, f"{path}.state.title")
        _validate_shape(state["description"], str, f"{path}.state.description")
        _validate_shape(
            state["type_specific"], TYPE_SPECIFIC_SHAPES[content_type],
            f"{path}.state.type_specific",
        )

        adjudication = _require_fields(case["adjudication"], ADJUDICATION_FIELDS, f"{path}.adjudication")
        status = adjudication["status"]
        reviewers = adjudication["reviewer_count"]
        guideline = adjudication["guideline_revision"]
        if not isinstance(status, str) or status not in {"synthetic", "human_adjudicated"}:
            raise GoldCaseValidationError(f"{path}.adjudication.status: unsupported status")
        if type(reviewers) is not int or reviewers < 0:
            raise GoldCaseValidationError(f"{path}.adjudication.reviewer_count: expected non-negative integer")
        if not isinstance(guideline, str) or not GUIDELINE_RE.fullmatch(guideline):
            raise GoldCaseValidationError(f"{path}.adjudication.guideline_revision: invalid revision label")
        if status == "synthetic" and (case["source_kind"] != "synthetic_text" or reviewers != 0):
            raise GoldCaseValidationError(f"{path}.adjudication: synthetic metadata mismatch")
        if status == "human_adjudicated" and (case["source_kind"] != "catalog_text" or reviewers < 1):
            raise GoldCaseValidationError(f"{path}.adjudication: human label metadata mismatch")
        cases.append(deepcopy(dict(case)))
    return tuple(cases)


def load_gold_dataset(path: str | Path) -> tuple[dict[str, Any], ...]:
    """Read a local UTF-8 JSON file; no network or database access occurs."""
    try:
        document = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as error:
        raise GoldCaseValidationError("dataset file is not readable UTF-8 JSON") from error
    return validate_gold_dataset(document)
