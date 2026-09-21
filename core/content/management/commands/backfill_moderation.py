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


def _iter_items(after_id: int, limit: int, batch_size: int) -> Iterator[ContentItem]:
    last_id = after_id
    while True:
        page_size = limit if limit and limit < batch_size else batch_size
        page = list(
            ContentItem.objects.filter(pk__gt=last_id)
            .order_by('pk')[:page_size]
        )
        if not page:
            return
        yield from page
        last_id = page[-1].pk
        if limit and last_id >= limit + after_id:
            return
        if len(page) < batch_size and not limit:
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
        stdout = self.stdout

        if batch_size <= 0:
            raise CommandError('batch-size must be a positive integer')
        if delay_ms < 0:
            raise CommandError('delay-ms must be a non-negative integer')

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
        started_monotonic = time.monotonic()
        errors = []

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
                    errors.append({'item_id': item.pk, 'error_code': 'unhandled_exception'})
                    _emit(stdout, {
                        'event': 'item', 'item_id': item.pk, 'outcome': 'error',
                        'error_code': 'unhandled_exception', 'detail': str(exc.__class__.__name__),
                        'duration_ms': round((time.monotonic() - item_started) * 1000),
                    })
                else:
                    if isinstance(result, ContentItem) is False and hasattr(result, 'kind'):
                        # Typed non-row outcome.
                        if result.kind == 'skipped':
                            stats['skipped'] += 1
                        else:
                            stats['unavailable'] += 1
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
                            stats['provider_override'] += 1
                        elif reused:
                            stats['reused'] += 1
                            # Historical usage belongs to the original call, not this backfill.
                            input_tokens = None
                            output_tokens = None
                        else:
                            stats['created'] += 1
                        if provider_override:
                            stats['created'] += 1
                        if classification:
                            stats['buckets'][classification] = (
                                stats['buckets'].get(classification, 0) + 1
                            )
                        if input_tokens is None and output_tokens is None:
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

                if delay_s > 0:
                    time.sleep(delay_s)

            pricing = dict(DEFAULT_PRICING_SNAPSHOT)
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
            stats['errors'] = errors

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
