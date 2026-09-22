"""Framework-independent backfill execution runner (JEV-003B slice 2C).

Pages ContentItem-like objects in strictly ascending pk through an injected
fetcher, classifies each through an injected adapter, and accounts every
outcome with the parent metrics core. No Django, ORM, management command,
filesystem report, or real Jev dependency: the command slice supplies the
ORM-backed fetcher and the service-backed adapter.
"""
from __future__ import annotations

import time
from dataclasses import dataclass
from typing import Callable, Iterator

from content.services.backfill_metrics import (
    BackfillMetrics,
    PricingSnapshot,
    RetryIds,
    account_item,
    summarize,
)

_END = object()


def _require_int(name: str, value, *, minimum: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int) or value < minimum:
        raise ValueError(f'{name} must be an integer >= {minimum}, got {value!r}')
    return value


@dataclass(frozen=True)
class BackfillRunConfig:
    """Validated execution bounds. `limit` is an exact item count (0 = unbounded)."""

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


def iter_ordered(fetch_page: Callable[[int, int], object], *, after_id: int,
                 batch_size: int) -> Iterator:
    """Yield pages' items in strictly ascending pk, failing loudly otherwise.

    A page that repeats the cursor or returns out-of-order rows raises
    ValueError instead of looping forever or silently skipping content.
    """
    last_id = after_id
    while True:
        page = list(fetch_page(last_id, batch_size))
        if not page:
            return
        for item in page:
            if item.pk <= last_id:
                raise ValueError(
                    f'non-advancing page after id {last_id}: got pk {item.pk!r}')
            last_id = item.pk
            yield item
        if len(page) < batch_size:
            return


def _item_event(metrics: BackfillMetrics, item_id: int, result,
                observation: dict, duration_ms: int) -> dict:
    if hasattr(result, 'kind'):
        return account_item(metrics, item_id, kind=result.kind,
                            observation=observation, code=result.code,
                            duration_ms=duration_ms)
    payload = result.payload or {}
    return account_item(metrics, item_id, kind='classified', observation=observation,
                        classification=result.classification, model_name=result.model_name,
                        provider_override=payload.get('provider_explicit') is True,
                        duration_ms=duration_ms)


def _progress_event(metrics: BackfillMetrics, duration_seconds: float) -> dict:
    return {
        'event': 'progress',
        'scanned': metrics.scanned,
        'created': metrics.created,
        'reused': metrics.reused,
        'skipped': metrics.skipped,
        'unavailable': metrics.unavailable,
        'error': metrics.error,
        'last_id': metrics.last_id,
        'duration_seconds': duration_seconds,
        'throughput_items_per_second': round(
            metrics.scanned / max(duration_seconds, 0.001), 3),
    }


def run_backfill(*, fetch_page: Callable[[int, int], object],
                 classify: Callable[..., object], config: BackfillRunConfig,
                 pricing: PricingSnapshot, emit: Callable[[dict], None],
                 clock: Callable[[], float] = time.monotonic,
                 sleep: Callable[[float], None] = time.sleep) -> dict:
    """Run one bounded backfill, emit its events, and return the final summary.

    Per-item adapter failures become error events with bounded retry IDs while
    the run continues; page-ordering violations abort loudly. The delay applies
    only between attempted items, never after the final one.
    """
    metrics = BackfillMetrics(
        last_id=config.after_id,
        failed_ids=RetryIds(config.max_retry_ids),
        unavailable_ids=RetryIds(config.max_retry_ids),
    )
    started = clock()
    delay_seconds = config.delay_ms / 1000.0
    pending = _next_item(iter_ordered(
        fetch_page, after_id=config.after_id, batch_size=config.batch_size))
    attempted = 0
    since_progress = 0
    while pending is not _END and (not config.limit or attempted < config.limit):
        item, iterator = pending
        attempted += 1
        item_started = clock()
        metrics.scanned += 1
        metrics.last_id = item.pk
        observation: dict = {}
        try:
            result = classify(item, observation=observation)
        except Exception:
            emit(account_item(metrics, item.pk, kind='error', code='unhandled_exception',
                              duration_ms=_elapsed_ms(clock, item_started)))
        else:
            emit(_item_event(metrics, item.pk, result, observation,
                             _elapsed_ms(clock, item_started)))
        since_progress += 1
        if since_progress >= config.progress_every:
            emit(_progress_event(metrics, round(clock() - started, 3)))
            since_progress = 0
        pending = _next_item(iterator) if (not config.limit or attempted < config.limit) else _END
        if pending is not _END and delay_seconds > 0:
            sleep(delay_seconds)
    summary = summarize(metrics, pricing, duration_seconds=round(clock() - started, 3))
    emit(summary)
    return summary


def _next_item(iterator: Iterator):
    try:
        return next(iterator), iterator
    except StopIteration:
        return _END


def _elapsed_ms(clock: Callable[[], float], started: float) -> int:
    return round((clock() - started) * 1000)
