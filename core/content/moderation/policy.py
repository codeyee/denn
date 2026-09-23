"""Typed, code-owned moderation policy composer (JEV-002B).

Pure and offline: consumes three raw Jev probabilities plus a provider-level
explicit/adult status, and returns a typed decision and reason without mutating
persistence or calling Jev. Provider flags are the authoritative hard override;
Jev is advisory. Enforcement remains shadow-only/JEV-005.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal, NamedTuple

Decision = Literal[
    "safe_for_automatic_discovery",
    "explicit_or_sensitive",
    "needs_review",
    "unknown",
]


def _validated_threshold(name: str, value: object) -> float:
    """Validate a threshold is a finite float in [0.0, 1.0], else raise ValueError."""
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ValueError(f"{name} must be a real number, got {value!r}")
    number = float(value)
    if number != number or number in (float("inf"), float("-inf")):
        raise ValueError(f"{name} must be finite, got {value!r}")
    if not 0.0 <= number <= 1.0:
        raise ValueError(f"{name} must be in [0, 1], got {value!r}")
    return number


@dataclass(frozen=True)
class PolicyThresholds:
    """Configurable cutoffs; every member is a validated float in 0..1.

    Defaults are provisional and not production-tuned; enforcement remains
    disabled by default and shadow-only until JEV-005.
    """

    safe_min: float = 0.75
    explicit_at: float = 0.75
    review_at: float = 0.75

    def __post_init__(self) -> None:
        for name in ("safe_min", "explicit_at", "review_at"):
            object.__setattr__(self, name, _validated_threshold(name, getattr(self, name)))


class PolicyInput(NamedTuple):
    """Leaf inputs the composer consumes.

    `provider_explicit` is the provider's affirmative explicit/adult flag:
    True is the authoritative hard override; False or None never certifies
    safety (provider false negatives are expected and untrusted).
    """

    provider_explicit: bool | None
    safe: float | None
    explicit: float | None
    review: float | None


class PolicyResult(NamedTuple):
    """Typed decision and reason; no mutation, no persistence, no Jev call."""

    decision: Decision
    reason: str


def _validated_probability(name: str, value: object) -> float | None:
    """Validate a probability is None or a finite float in [0, 1]."""
    if value is None:
        return None
    if not isinstance(value, (int, float)) or isinstance(value, bool):
        raise ValueError(f"{name} must be a real number or None, got {value!r}")
    number = float(value)
    if number != number or number in (float("inf"), float("-inf")):
        raise ValueError(f"{name} must be finite or None, got {value!r}")
    if not 0.0 <= number <= 1.0:
        raise ValueError(f"{name} must be in [0, 1] or None, got {value!r}")
    return number


def compose_policy(
    provider_explicit: bool | None,
    safe: object,
    explicit: object,
    review: object,
    *,
    thresholds: PolicyThresholds | None = None,
) -> PolicyResult:
    """Return the typed decision for one raw-probability slice.

    Provider override -> explicit (and never safe). Jev is advisory only:
    explicit signal at/above threshold fails closed to explicit; review signal
    at/above threshold becomes needs_review; automatic discovery is allowed
    only when safe is clean and explicit/review are below thresholds. Missing,
    invalid, or contradictory inputs fail closed to needs_review or unknown;
    expected unavailable/skipped outcomes never raise.
    """
    thresholds = thresholds or PolicyThresholds()
    if provider_explicit is True:
        return PolicyResult("explicit_or_sensitive", "provider_explicit_override")
    if provider_explicit is not False and provider_explicit is not None:
        return PolicyResult("unknown", "corrupt_provider_explicit_input")
    try:
        safe_prob = _validated_probability("safe", safe)
        explicit_prob = _validated_probability("explicit", explicit)
        review_prob = _validated_probability("review", review)
    except ValueError:
        return PolicyResult("unknown", "invalid_probability_input")
    if (
        explicit_prob is not None
        and explicit_prob >= thresholds.explicit_at
    ):
        return PolicyResult(
            "explicit_or_sensitive", "jev_explicit_at_or_above_threshold"
        )
    if review_prob is not None and review_prob >= thresholds.review_at:
        return PolicyResult("needs_review", "jev_review_at_or_above_threshold")
    if safe_prob is None or explicit_prob is None or review_prob is None:
        return PolicyResult("needs_review", "incomplete_jev_answers")
    if safe_prob >= thresholds.safe_min:
        return PolicyResult("safe_for_automatic_discovery", "jev_safe_at_or_above_threshold")
    return PolicyResult("needs_review", "safe_below_threshold")
