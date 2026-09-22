"""Thin observable backfill command over the framework-independent runner.

Prints one compact JSON object per line (item and progress events, then one
final summary) and optionally writes that summary atomically to --report.
Live Jev calls happen only through classify_content_item, only with
--confirm-live and an explicit positive --limit; tests patch that boundary.
"""
from __future__ import annotations

import json
import os
import tempfile
from argparse import ArgumentTypeError

from django.core.management.base import BaseCommand, CommandError

from content.models import ContentItem
from content.services.backfill_metrics import default_pricing
from content.services.backfill_runner import BackfillRunConfig, run_backfill
from content.services.moderation_service import classify_content_item


def _positive_int(raw):
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise ArgumentTypeError('must be a positive integer')
    if isinstance(raw, bool) or value <= 0:
        raise ArgumentTypeError('must be a positive integer')
    return value


def _non_negative_int(raw):
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise ArgumentTypeError('must be a non-negative integer')
    if isinstance(raw, bool) or value < 0:
        raise ArgumentTypeError('must be a non-negative integer')
    return value


def _fetch_page(after_id: int, page_size: int):
    return list(
        ContentItem.objects.filter(pk__gt=after_id).order_by('pk')[:page_size])


def _write_report_atomic(path: str, summary: dict) -> None:
    directory = os.path.dirname(os.path.abspath(path))
    if not os.path.isdir(directory):
        raise CommandError(f'report directory does not exist: {directory}')
    fd, tmp_path = tempfile.mkstemp(dir=directory, prefix='.backfill-',
                                     suffix='.tmp')
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as handle:
            json.dump(summary, handle, sort_keys=True, default=str)
            handle.write('\n')
        os.replace(tmp_path, path)
    except Exception:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
        raise


class Command(BaseCommand):
    help = ('Classify existing content with Jev and print JSONL events plus a '
            'final summary. Requires --confirm-live and a positive --limit.')

    def add_arguments(self, parser):
        parser.add_argument('--after-id', type=_non_negative_int, default=0)
        parser.add_argument('--limit', type=_positive_int, required=True)
        parser.add_argument('--batch-size', type=_positive_int, default=200)
        parser.add_argument('--delay-ms', type=_non_negative_int, default=0)
        parser.add_argument('--progress-every', type=_positive_int, default=50)
        parser.add_argument('--max-retry-ids', type=_non_negative_int, default=100)
        parser.add_argument('--report', default=None)
        parser.add_argument('--input-price-per-1m', default=None)
        parser.add_argument('--confirm-live', action='store_true')

    def handle(self, *args, **options):
        if not options['confirm_live']:
            raise CommandError('refusing to run without --confirm-live')
        pricing = default_pricing()
        if options['input_price_per_1m'] is not None:
            try:
                pricing = pricing.with_input_rate(options['input_price_per_1m'])
            except ValueError as error:
                raise CommandError(f'invalid --input-price-per-1m: {error}')
        try:
            config = BackfillRunConfig(
                after_id=options['after_id'], limit=options['limit'],
                batch_size=options['batch_size'], delay_ms=options['delay_ms'],
                progress_every=options['progress_every'],
                max_retry_ids=options['max_retry_ids'])
        except ValueError as error:
            raise CommandError(f'invalid option: {error}')

        def emit(event: dict) -> None:
            self.stdout.write(json.dumps(event, sort_keys=True,
                                         separators=(',', ':'), default=str))

        summary = run_backfill(fetch_page=_fetch_page,
                               classify=classify_content_item,
                               config=config, pricing=pricing, emit=emit)
        if options['report']:
            try:
                _write_report_atomic(options['report'], summary)
            except CommandError:
                raise
            except OSError as error:
                raise CommandError(f'cannot write --report: {error}')
