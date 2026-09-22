"""Reusable moderation backfill runner and metrics core (JEV-003B).

Framework-independent: the runner iterates whatever page fetcher it is given
and delegates per-item classification to an injected callable. The Django
management command supplies the ORM-backed fetcher and the classification
service, then writes the returned summary to stdout and an optional report.
Keeping the core free of Django makes every accounting rule testable offline.
"""
from __future__ import annotations

import time
from dataclasses import asdict, dataclass, field, replace
from typing import Callable, Iterator, Sequence

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

CLASSIFICATION_BUCKETS = (
    'safe_for_automatic_discovery',
    'explicit_or_sensitive',
    'needs_review',
    'unknown',
)

OUTCOME_KINDS = ('classified', 'skipped', 'unavailable', 'error')


def parse_price(raw, name: str = 'price') -> float:
    """Parse an operator price into a finite non-negative float, else raise."""
    try:
        number = float(raw)
    except (TypeError, ValueError) as error:
        raise ValueError(f'{name} must be a finite number') from error
    if number != number or number in (float('inf'), float('-inf')) or number < 0:
        raise ValueError(f'{name} must be a non-negative finite number')
    return number


def _require_int(name: str, value, *, minimum: int) -> None:
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        raise ValueError(f'{name} must be an integer >= {minimum}, got {value!r}')


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
        input_cost = (
            input_tokens / self.input_tokens_per_unit
        ) * self.input_price_per_unit
        output_cost = (
            output_tokens / self.output_tokens_per_unit
        ) * self.output_price_per_unit
        return round(input_cost + output_cost, 6)

    def with_input_rate(self, input_price_per_unit: float) -> 'PricingSnapshot':
        """Return a copy using an operator rate, keeping the provenance intact."""
        rate = parse_price(input_price_per_unit, 'input_price_per_unit')
        return replace(
            self,
            input_price_per_unit=rate,
            note=f'Configured rate override; {self.note}',
        )


def default_pricing() -> PricingSnapshot:
    """Return the published pricing snapshot used when no rate is configured."""
    return PricingSnapshot(**DEFAULT_PRICING_SNAPSHOT)


@dataclass(frozen=True)
class BackfillLimits:
    """Validated run bounds. `limit` is an exact item count, not a PK window."""

    after_id: int = 0
    limit: int = 0
    batch_size: int = 200
    delay_ms: int = 0
    progress_every: int = 50
    max_retry_ids: int = 100

    def __post_init__(self) -> None:
        _require_int('after_id', self.after_id, minimum=0)
        _require_int('limit', self.limit, minimum=0)
        _require_int('batch_size', self.batch_size, minimum=1)
        _require_int('delay_ms', self.delay_ms, minimum=0)
        _require_int('progress_every', self.progress_every, minimum=1)
        _require_int('max_retry_ids', self.max_retry_ids, minimum=0)


class RetryIds:
    """Collect bounded retry identifiers and count the ones it dropped."""

    def __init__(self, max_ids: int) -> None:
        self._max_ids = max_ids
        self.ids: list[int] = []
        self.dropped = 0

    def add(self, item_id: int) -> None:
        if len(self.ids) < self._max_ids:
            self.ids.append(item_id)
        else:
            self.dropped += 1

    def as_summary(self, key: str) -> dict:
        return {key: list(self.ids), f'{key}_truncated': self.dropped}


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
    buckets: dict = field(
        default_factory=lambda: {name: 0 for name in CLASSIFICATION_BUCKETS}
    )
    failed_ids: RetryIds = None
    unavailable_ids: RetryIds = None


def iter_items(
    fetch_page: Callable[[int, int], Sequence],
    *,
    after_id: int,
    limit: int,
    batch_size: int,
) -> Iterator:
    """Yield items in primary-key order, stopping after exactly `limit` items.

    `limit` counts yielded items rather than bounding a primary-key range, so a
    run cannot overshoot its authorized work when keys are sparse or large.
    """
    last_id = after_id
    yielded = 0
    while True:
        page = list(fetch_page(last_id, batch_size))
        if not page:
            return
        for item in page:
            yield item
            yielded += 1
            if limit and yielded >= limit:
                return
        last_id = page[-1].pk
        if len(page) < batch_size:
            return


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

    Usage attribution has one rule: only a completed remote call contributes
    tokens or a missing-usage count. Reuse without a call, provider overrides,
    disabled/skipped outcomes, and failures contribute neither, while a call
    that collapsed onto an existing row still contributes its own usage.
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
        input_tokens = usage.get('input_tokens') if usage else None
        output_tokens = usage.get('output_tokens') if usage else None
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


def _elapsed_ms(clock: Callable[[], float], started: float) -> int:
    return round((clock() - started) * 1000)


def _throughput(scanned: int, duration_seconds: float) -> float:
    return round(scanned / max(duration_seconds, 0.001), 3)


def _progress_event(metrics: BackfillMetrics, duration: float) -> dict:
    return {
        'event': 'progress',
        'scanned': metrics.scanned,
        'created': metrics.created,
        'reused': metrics.reused,
        'skipped': metrics.skipped,
        'unavailable': metrics.unavailable,
        'error': metrics.error,
        'duration_seconds': duration,
        'throughput_items_per_second': _throughput(metrics.scanned, duration),
        'last_id': metrics.last_id,
    }


def _item_event(
    metrics: BackfillMetrics,
    item_id: int,
    result,
    observation: dict,
    duration_ms: int,
) -> dict:
    if hasattr(result, 'kind'):
        return account_item(
            metrics, item_id, kind=result.kind,
            observation=observation, code=result.code, duration_ms=duration_ms,
        )
    payload = result.payload or {}
    return account_item(
        metrics, item_id, kind='classified',
        observation=observation,
        classification=result.classification,
        model_name=result.model_name,
        provider_override=payload.get('provider_explicit') is True,
        duration_ms=duration_ms,
    )


def _final_summary(
    metrics: BackfillMetrics, pricing: PricingSnapshot, duration: float,
) -> dict:
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
        'duration_seconds': duration,
        'throughput_items_per_second': _throughput(metrics.scanned, duration),
        'estimated_cost_usd': pricing.estimate_cost_usd(
            metrics.input_tokens, metrics.output_tokens
        ),
        'pricing_snapshot': pricing.as_dict(),
    }
    summary.update(metrics.failed_ids.as_summary('failed_item_ids'))
    summary.update(metrics.unavailable_ids.as_summary('unavailable_item_ids'))
    return summary


def run_backfill(
    *,
    fetch_page: Callable[[int, int], Sequence],
    classify: Callable[..., object],
    limits: BackfillLimits,
    pricing: PricingSnapshot,
    emit: Callable[[dict], None],
    clock: Callable[[], float] = time.monotonic,
    sleep: Callable[[float], None] = time.sleep,
) -> dict:
    """Run one bounded backfill, emit its events, and return the final summary.

    A failing item is recorded and the run continues, so one bad item cannot
    abandon the remaining work. Classification is always the injected callable,
    which keeps this function free of Django and of any implicit network use.
    """
    metrics = BackfillMetrics(
        last_id=limits.after_id,
        failed_ids=RetryIds(limits.max_retry_ids),
        unavailable_ids=RetryIds(limits.max_retry_ids),
    )
    started = clock()
    delay_seconds = limits.delay_ms / 1000.0
    since_progress = 0

    for item in iter_items(
        fetch_page,
        after_id=limits.after_id,
        limit=limits.limit,
        batch_size=limits.batch_size,
    ):
        item_started = clock()
        metrics.scanned += 1
        metrics.last_id = item.pk
        observation: dict = {}
        try:
            result = classify(item, observation=observation)
        except Exception:
            emit(account_item(
                metrics, item.pk, kind='error', code='unhandled_exception',
                duration_ms=_elapsed_ms(clock, item_started),
            ))
        else:
            emit(_item_event(
                metrics, item.pk, result, observation,
                _elapsed_ms(clock, item_started),
            ))

        since_progress += 1
        if since_progress >= limits.progress_every:
            emit(_progress_event(metrics, round(clock() - started, 3)))
            since_progress = 0

        if delay_seconds > 0:
            sleep(delay_seconds)

    summary = _final_summary(metrics, pricing, round(clock() - started, 3))
    emit(summary)
    return summary
