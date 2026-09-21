"""Resumable, rate-bounded backfill of content moderation judgments (JEV-003B).

Iterates ``ContentItem`` rows ordered by primary key and delegates per-item
classification to the accepted JEV-003A service. Events are structured JSON
lines: one per item, a periodic aggregate, and one final run summary. The
command performs no hidden network check; Jev calls happen only through the
existing service and only while ``MODERATION_CLASSIFICATION_ENABLED`` is True.
"""
from __future__ import annotations

import json
import os
import tempfile
import time
from argparse import ArgumentTypeError
from dataclasses import dataclass, field
from typing import Iterator

from django.core.management.base import BaseCommand, CommandError

from content.models import ContentItem
from content.services.moderation_service import classify_content_item


DEFAULT_PRICING_SNAPSHOT = {
    'source_url': 'https://typesafe.ai/blog/introducing-system-one-models-and-jev',
    'source_date': '2026-09-15',
    'accessed_date': '2026-09-21',
    'currency': 'USD',
    'input_tokens_per_unit': 1_000_000,
    'input_price_per_unit': 0.042,
    'output_tokens_per_unit': 1_000_000,
    'output_price_per_unit': 0.0,
    'note': (
        'Estimate only; account or gateway pricing may differ.'
    ),
}


def _positive_int(raw):
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise ArgumentTypeError('must be a positive integer')
    if value <= 0:
        raise ArgumentTypeError('must be a positive integer')
    return value


def _non_negative_int(raw):
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise ArgumentTypeError('must be a non-negative integer')
    if value < 0:
        raise ArgumentTypeError('must be a non-negative integer')
    return value


def _emit(stream, event: dict) -> None:
    stream.write(json.dumps(event, sort_keys=True, default=str) + '\n')
    stream.flush()


def _progress_event(stream, stats: dict, started_monotonic: float) -> None:
    duration = round(time.monotonic() - started_monotonic, 3)
    throughput = round(stats['scanned'] / max(duration, 0.001), 3)
    _emit(stream, {
        'event': 'progress', 'scanned': stats['scanned'],
        'created': stats['created'], 'reused': stats['reused'],
        'skipped': stats['skipped'], 'unavailable': stats['unavailable'],
        'error': stats['error'], 'duration_seconds': duration,
        'throughput_items_per_second': throughput, 'last_id': stats['last_id'],
    })


def _iter_items(
    after_id: int, limit: int, batch_size: int,
) -> Iterator[ContentItem]:
    last_id = after_id
    yielded = 0
    while True:
        page_size = batch_size
        page = list(
            ContentItem.objects.filter(pk__gt=last_id)
            .order_by('pk')[:page_size]
        )
        if not page:
            return
        for candidate in page:
            yield candidate
            yielded += 1
            if limit and yielded >= limit:
                return
        last_id = page[-1].pk
        if len(page) < batch_size:
            return


class Command(BaseCommand):
    help = 'Resumable, rate-bounded moderation backfill over existing content items.'

    def add_arguments(self, parser):
        parser.add_argument('--after-id', type=_positive_int, default=0,
                            help='Resume processing after this primary-key cursor.')
        parser.add_argument('--limit', type=_positive_int, default=0,
                            help='Cap on the number of items processed this run (0 = no cap).')
        parser.add_argument('--batch-size', type=_positive_int, default=200,
                            help='Iterator page size for the bounded scan.')
        parser.add_argument('--delay-ms', type=_non_negative_int, default=0,
                            help='Pause between processed items, in milliseconds.')
        parser.add_argument('--progress-every', type=_positive_int, default=50,
                            help='Emit a progress summary event after every N items.')
        parser.add_argument('--input-price-per-1m', default=None,
                            help='Override the pricing snapshot input rate (USD per 1M tokens).')
        parser.add_argument('--report', default=None,
                            help='Optional path for an atomic JSON summary report.')
        parser.add_argument('--create-parent-dirs', action='store_true',
                            help='Create missing parent directories for --report.')

    def handle(self, *args, **options):
        after_id = options['after_id']
        limit = options['limit']
        batch_size = options['batch_size']
        delay_ms = options['delay_ms']
        delay_s = delay_ms / 1000.0
        report_path = options['report']
        create_parents = options['create_parent_dirs']
        progress_every = options['progress_every']
        rate_override = options['input_price_per_1m']
        stdout = self.stdout
        input_price = None

        if batch_size <= 0:
            raise CommandError('batch-size must be a positive integer')
        if delay_ms < 0:
            raise CommandError('delay-ms must be a non-negative integer')
        if rate_override is not None:
            try:
                input_price = float(rate_override)
            except ValueError as err:
                raise CommandError('input-price-per-1m must be a finite number') from err
            if input_price < 0 or input_price != input_price or input_price in (
                float('inf'), float('-inf'),
            ):
                raise CommandError('input-price-per-1m must be non-negative and finite')

        stats = {
            'scanned': 0, 'created': 0, 'reused': 0,
            'provider_override': 0, 'skipped': 0, 'unavailable': 0,
            'error': 0,
            'buckets': {
                'safe_for_automatic_discovery': 0,
                'explicit_or_sensitive': 0,
                'needs_review': 0,
                'unknown': 0,
            },
            'input_tokens': 0, 'output_tokens': 0, 'missing_usage': 0,
            'last_id': after_id,
        }
        unavailable_item_ids: list[int] = []
        failed_item_ids: list[int] = []
        progress_every = max(progress_every, 1) if progress_every else 1
        started_monotonic = time.monotonic()
        processed_since_progress = 0

        try:
            for item in _iter_items(after_id, limit, batch_size):
                item_started = time.monotonic()
                stats['scanned'] += 1
                stats['last_id'] = item.pk
                observation: dict = {}
                try:
                    result = classify_content_item(item, observation=observation)
                except Exception as exc:  # failure isolation: continue.
                    stats['error'] += 1
                    # Bounded list keeps a compact retry cursor for the operator.
                    failed_item_ids.append(item.pk)
                    outcome = 'error'
                    code = 'unhandled_exception'
                    classification = None
                    model_name = None
                    provider_override = False
                    reused = False
                    usage = {'input_tokens': None, 'output_tokens': None}
                    _emit(stdout, {
                        'event': 'item', 'item_id': item.pk, 'outcome': outcome,
                        'code': code, 'classification': classification,
                        'model_name': model_name, 'provider_override': provider_override,
                        'reused': reused, 'usage': usage,
                        'duration_ms': round((time.monotonic() - item_started) * 1000),
                    })
                else:
                    if isinstance(result, ContentItem) is False and hasattr(result, 'kind'):
                        # Typed non-row outcome.
                        if result.kind == 'skipped':
                            stats['skipped'] += 1
                        else:
                            stats['unavailable'] += 1
                            # Bounded precise retry cursor for the operator.
                            unavailable_item_ids.append(item.pk)
                        outcome = result.kind
                        code = result.code
                        usage = None
                        classification = None
                        model_name = None
                        provider_override = False
                        reused = bool(observation.get('reused'))
                    else:
                        payload = result.payload or {}
                        outcome = 'classified'
                        code = None
                        classification = result.classification
                        model_name = result.model_name
                        provider_override = payload.get('provider_explicit') is True
                        usage = payload.get('usage') or {}
                        input_tokens = usage.get('input_tokens')
                        output_tokens = usage.get('output_tokens')
                        reused = bool(observation.get('reused'))
                        if provider_override:
                            # Orthogonal signal; reuse/state still tracked separately.
                            stats['provider_override'] += 1
                        if reused:
                            stats['reused'] += 1
                            # Historical usage belongs to the original call, not this backfill.
                            input_tokens = None
                            output_tokens = None
                        else:
                            stats['created'] += 1
                        if classification:
                            stats['buckets'][classification] = (
                                stats['buckets'].get(classification, 0) + 1
                            )
                        if input_tokens is None and output_tokens is None:
                            # Genuine remote call completed but returned no usage.
                            stats['missing_usage'] += 1
                        else:
                            if input_tokens is not None:
                                stats['input_tokens'] += input_tokens
                            if output_tokens is not None:
                                stats['output_tokens'] += output_tokens
                    event = {
                        'event': 'item', 'item_id': item.pk, 'outcome': outcome,
                        'classification': classification, 'model_name': model_name,
                        'provider_override': provider_override if outcome == 'classified' else None,
                        'reused': reused, 'usage': usage, 'code': code,
                        'duration_ms': round((time.monotonic() - item_started) * 1000),
                    }
                    _emit(stdout, event)

                processed_since_progress += 1
                if processed_since_progress >= progress_every and (
                    progress_every > 0
                ):
                    _progress_event(stdout, stats, started_monotonic)
                    processed_since_progress = 0

                if delay_s > 0:
                    time.sleep(delay_s)

            pricing = dict(DEFAULT_PRICING_SNAPSHOT)
            if input_price is not None:
                pricing['input_price_per_unit'] = input_price
                pricing['note'] = (
                    'Configured rate override; Estimate only; '
                    'account or gateway pricing may differ.'
                )
            input_cost = (
                stats['input_tokens'] / pricing['input_tokens_per_unit']
            ) * pricing['input_price_per_unit']
            output_cost = (
                stats['output_tokens'] / pricing['output_tokens_per_unit']
            ) * pricing['output_price_per_unit']
            stats['estimated_cost_usd'] = round(input_cost + output_cost, 6)
            stats['pricing_snapshot'] = pricing
            stats['duration_seconds'] = round(time.monotonic() - started_monotonic, 3)
            stats['throughput_items_per_second'] = round(
                stats['scanned'] / max(stats['duration_seconds'], 0.001), 3
            )
            # Precise retry cursors for the operator; no ERROR tombstone rows.
            stats['failed_item_ids'] = failed_item_ids
            stats['unavailable_item_ids'] = unavailable_item_ids

            _emit(stdout, {'event': 'final_summary', **stats})

            if report_path:
                parent = os.path.dirname(os.path.abspath(report_path))
                if create_parents and not os.path.isdir(parent):
                    os.makedirs(parent, exist_ok=True)
                with tempfile.NamedTemporaryFile(
                    'w', dir=parent, delete=False, suffix='.tmp',
                ) as tmp_stream:
                    json.dump(
                        {'event': 'final_summary', **stats},
                        tmp_stream, indent=2, sort_keys=True, default=str,
                    )
                os.replace(tmp_stream.name, report_path)

        except (OSError, ValueError) as outer_error:
            # No partial overwrite; surface typed failure with no report write.
            raise CommandError(f'backfill_moderation failed: {outer_error}') from outer_error
