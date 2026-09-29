"""Backfill pricing snapshot and cost estimation (JEV-003B slice 2A).

Framework-independent: published TypeSafe pricing plus its provenance and a
validated operator rate override. No Django, ORM, network, or Jev calls.
Item accounting, retry bounds, and summary serialization follow in the next
stacked slice; the full draft is preserved out of tree until then.
"""
from __future__ import annotations

import math
from dataclasses import asdict, dataclass, field, replace

DEFAULT_PRICING_SNAPSHOT = {
    'source_url': 'https://typesafe.ai/blog/introducing-system-one-models-and-jev',
    'source_date': '2026-09-15',
    'accessed_date': '2026-09-21',
    'currency': 'USD',
    'input_tokens_per_unit': 1_000_000,
    'input_price_per_unit': 0.042,
    'output_tokens_per_unit': 1_000_000,
    'output_price_per_unit': 0.0,
    'note': 'Estimate only; account or gateway pricing may differ.',
}


def parse_price(raw, name: str = 'price') -> float:
    """Parse an operator price into a finite non-negative float, else raise."""
    if isinstance(raw, bool):
        raise ValueError(f'{name} must be a non-negative finite number')
    try:
        number = float(raw)
    except (TypeError, ValueError) as error:
        raise ValueError(f'{name} must be a finite number') from error
    if number != number or number in (float('inf'), float('-inf')) or number < 0:
        raise ValueError(f'{name} must be a non-negative finite number')
    return number


@dataclass(frozen=True)
class PricingSnapshot:
    """Published model pricing plus its provenance, used for cost estimates."""

    source_url: str
    source_date: str
    accessed_date: str
    currency: str
    input_tokens_per_unit: int
    input_price_per_unit: float
    output_tokens_per_unit: int
    output_price_per_unit: float
    note: str

    def as_dict(self) -> dict:
        return asdict(self)

    def estimate_cost_usd(self, input_tokens: int, output_tokens: int) -> float:
        """Return the estimated USD cost for the given attributable tokens."""
        input_cost = input_tokens / self.input_tokens_per_unit * self.input_price_per_unit
        output_cost = output_tokens / self.output_tokens_per_unit * self.output_price_per_unit
        return round(input_cost + output_cost, 6)

    def with_input_rate(self, input_price_per_unit: float) -> 'PricingSnapshot':
        """Return a copy using an operator rate, keeping the provenance intact."""
        rate = parse_price(input_price_per_unit, 'input_price_per_unit')
        return replace(self, input_price_per_unit=rate,
                       note=f'Configured rate override; {self.note}')


def default_pricing() -> PricingSnapshot:
    """Return the published pricing snapshot used when no rate is configured."""
    return PricingSnapshot(**DEFAULT_PRICING_SNAPSHOT)


DEFAULT_MAX_RETRY_IDS = 100

CLASSIFICATION_BUCKETS = ('safe_for_automatic_discovery', 'explicit_or_sensitive',
                            'needs_review', 'unknown')

OUTCOME_KINDS = ('classified', 'skipped', 'unavailable', 'error')


def _require_token_count(value, *, field_name: str):
    """Return a valid token count, None when absent, else raise ValueError."""
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(f'{field_name} must be a non-negative integer or None')
    return value


class RetryIds:
    """Collect bounded retry identifiers and count the ones it dropped."""

    def __init__(self, max_ids: int = DEFAULT_MAX_RETRY_IDS) -> None:
        if isinstance(max_ids, bool) or not isinstance(max_ids, int) or max_ids < 0:
            raise ValueError(f'max_ids must be an integer >= 0, got {max_ids!r}')
        self._max_ids = max_ids
        self.ids: list[int] = []
        self.dropped = 0

    def add(self, item_id: int) -> None:
        if len(self.ids) < self._max_ids:
            self.ids.append(item_id)
        else:
            self.dropped += 1

    def as_summary(self, key: str) -> dict:
        return {
            key: list(self.ids),
            f'{key}_truncated_count': self.dropped,
            f'{key}_truncated': self.dropped > 0,
        }


@dataclass
class BackfillMetrics:
    """Operational counters for one run, plus bounded retry identifiers."""

    last_id: int = 0
    scanned: int = 0
    created: int = 0
    reused: int = 0
    provider_override: int = 0
    skipped: int = 0
    unavailable: int = 0
    error: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    missing_usage: int = 0
    buckets: dict = field(default_factory=lambda: dict.fromkeys(CLASSIFICATION_BUCKETS, 0))
    failed_ids: RetryIds = field(default_factory=RetryIds)
    unavailable_ids: RetryIds = field(default_factory=RetryIds)


def account_item(
    metrics: BackfillMetrics,
    item_id: int,
    *,
    kind: str,
    observation: dict | None = None,
    classification: str | None = None,
    model_name: str | None = None,
    provider_override: bool = False,
    code: str | None = None,
    duration_ms: int = 0,
) -> dict:
    """Update run metrics for one item and return its JSON-serializable event.

    Only a completed remote call contributes tokens or missing-usage; reuse
    without a call, overrides, skips, and failures contribute neither, while
    a collapsed alias call still contributes its own usage. Bad token counts
    raise instead of silently decreasing the totals.
    """
    if kind not in OUTCOME_KINDS:
        raise ValueError(f'unknown outcome kind: {kind!r}')

    facts = observation or {}
    reused = bool(facts.get('reused'))
    called = bool(facts.get('called'))
    usage = facts.get('usage') if called else None

    if kind == 'classified':
        if provider_override:
            metrics.provider_override += 1
        if reused:
            metrics.reused += 1
        else:
            metrics.created += 1
        if classification:
            metrics.buckets[classification] = metrics.buckets.get(classification, 0) + 1
    elif kind == 'skipped':
        metrics.skipped += 1
    elif kind == 'unavailable':
        metrics.unavailable += 1
        metrics.unavailable_ids.add(item_id)
    else:
        metrics.error += 1
        metrics.failed_ids.add(item_id)

    if called:
        get = usage.get if usage else lambda _key: None
        input_tokens = _require_token_count(get('input_tokens'), field_name='input_tokens')
        output_tokens = _require_token_count(get('output_tokens'), field_name='output_tokens')
        if input_tokens is None and output_tokens is None:
            metrics.missing_usage += 1
        else:
            metrics.input_tokens += input_tokens or 0
            metrics.output_tokens += output_tokens or 0

    return {
        'event': 'item',
        'item_id': item_id,
        'outcome': kind,
        'code': code,
        'classification': classification,
        'model_name': model_name,
        'provider_override': provider_override if kind == 'classified' else None,
        'reused': reused,
        'usage': usage,
        'duration_ms': duration_ms,
    }


def summarize(
    metrics: BackfillMetrics,
    pricing: PricingSnapshot,
    *,
    duration_seconds: float,
) -> dict:
    """Serialize the final run summary, including cost estimate and provenance."""
    if (isinstance(duration_seconds, bool)
            or not isinstance(duration_seconds, (int, float))
            or not math.isfinite(duration_seconds) or duration_seconds < 0):
        raise ValueError('duration_seconds must be a non-negative finite number')
    summary = {
        'event': 'final_summary',
        'scanned': metrics.scanned,
        'created': metrics.created,
        'reused': metrics.reused,
        'provider_override': metrics.provider_override,
        'skipped': metrics.skipped,
        'unavailable': metrics.unavailable,
        'error': metrics.error,
        'buckets': dict(metrics.buckets),
        'input_tokens': metrics.input_tokens,
        'output_tokens': metrics.output_tokens,
        'missing_usage': metrics.missing_usage,
        'last_id': metrics.last_id,
        'duration_seconds': duration_seconds,
        'throughput_items_per_second': round(metrics.scanned / max(duration_seconds, 0.001), 3),
        'estimated_cost_usd': pricing.estimate_cost_usd(metrics.input_tokens, metrics.output_tokens),
        'pricing_snapshot': pricing.as_dict(),
    }
    summary.update(metrics.failed_ids.as_summary('failed_item_ids'))
    summary.update(metrics.unavailable_ids.as_summary('unavailable_item_ids'))
    return summary
