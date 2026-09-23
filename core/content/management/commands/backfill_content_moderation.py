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
from bisect import bisect_right

from django.core.management.base import BaseCommand, CommandError

from content.models import ContentItem
from content.services.backfill_metrics import default_pricing
from content.services.backfill_runner import BackfillRunConfig, run_backfill
from content.services.moderation_service import classify_content_item

_ID_QUERY_CHUNK_SIZE = 500


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


def _positive_id_list(raw):
    if not isinstance(raw, str) or not raw.strip():
        raise ArgumentTypeError(
            'must be a comma-separated list of unique positive integer IDs')

    ids = []
    seen = set()
    for token in raw.split(','):
        token = token.strip()
        if not token or not token.isascii() or not token.isdecimal():
            raise ArgumentTypeError(
                'must be a comma-separated list of unique positive integer IDs')
        item_id = int(token)
        if item_id <= 0:
            raise ArgumentTypeError('every ID must be a positive integer')
        if item_id in seen:
            raise ArgumentTypeError(f'duplicate ContentItem ID: {item_id}')
        seen.add(item_id)
        ids.append(item_id)
    return tuple(ids)


def _chunks(values, size=_ID_QUERY_CHUNK_SIZE):
    for start in range(0, len(values), size):
        yield values[start:start + size]


def _fetch_page(after_id: int, page_size: int):
    return list(
        ContentItem.objects.filter(pk__gt=after_id).order_by('pk')[:page_size])


def _resolve_exact_ids(ids: tuple[int, ...]) -> tuple[int, ...]:
    existing_ids = set()
    for id_chunk in _chunks(ids):
        existing_ids.update(
            ContentItem.objects.filter(pk__in=id_chunk)
            .values_list('pk', flat=True))

    missing_ids = sorted(set(ids) - existing_ids)
    if missing_ids:
        preview = ', '.join(str(item_id) for item_id in missing_ids[:20])
        remainder = len(missing_ids) - min(len(missing_ids), 20)
        suffix = f' (+{remainder} more)' if remainder else ''
        raise CommandError(
            f'missing ContentItem IDs ({len(missing_ids)}): {preview}{suffix}')
    return tuple(sorted(ids))


def _fetch_exact_page(ids: tuple[int, ...], after_id: int, page_size: int):
    start = bisect_right(ids, after_id)
    page_ids = ids[start:start + page_size]
    items = []
    for id_chunk in _chunks(page_ids):
        items.extend(ContentItem.objects.filter(pk__in=id_chunk).order_by('pk'))

    found_ids = {item.pk for item in items}
    missing_ids = sorted(set(page_ids) - found_ids)
    if missing_ids:
        preview = ', '.join(str(item_id) for item_id in missing_ids[:20])
        remainder = len(missing_ids) - min(len(missing_ids), 20)
        suffix = f' (+{remainder} more)' if remainder else ''
        raise CommandError(
            'ContentItem IDs disappeared after preflight '
            f'({len(missing_ids)}): {preview}{suffix}')
    return sorted(items, key=lambda item: item.pk)


def _validate_report_path(path: str) -> str:
    if not isinstance(path, str) or not path:
        raise CommandError('invalid --report path: path must be a non-empty string')
    if '\x00' in path:
        raise CommandError('invalid --report path: NUL bytes are not allowed')

    try:
        absolute_path = os.path.abspath(path)
        directory = os.path.dirname(absolute_path)
    except (OSError, TypeError, ValueError) as error:
        raise CommandError(f'invalid --report path: {error}') from error

    if not os.path.isdir(directory):
        raise CommandError(
            f'report parent is missing or not a directory: {directory}')
    if not os.access(directory, os.W_OK):
        raise CommandError(f'report directory is not writable: {directory}')
    if os.path.isdir(absolute_path):
        raise CommandError(f'report path is a directory: {absolute_path}')
    return directory


def _write_report_atomic(path: str, summary: dict) -> None:
    directory = _validate_report_path(path)
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
            'final summary. Requires --confirm-live and a positive --limit. '
            'Use --ids for an exact sparse selection.')

    def add_arguments(self, parser):
        parser.add_argument('--after-id', type=_non_negative_int, default=None)
        parser.add_argument('--limit', type=_positive_int, required=True)
        parser.add_argument(
            '--ids', type=_positive_id_list, action='append', default=None,
            metavar='ID[,ID...]',
            help='classify exactly these unique positive ContentItem IDs')
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

        ids_options = options['ids']
        selected_ids = None
        selection = None
        after_id = options['after_id'] if options['after_id'] is not None else 0
        if ids_options is not None:
            if len(ids_options) != 1:
                raise CommandError('--ids may be supplied only once')
            if options['after_id'] is not None:
                raise CommandError('--ids cannot be combined with --after-id')
            selected_ids = ids_options[0]
            if len(selected_ids) > options['limit']:
                raise CommandError(
                    '--limit must be at least the number of supplied --ids')
            selected_ids = _resolve_exact_ids(selected_ids)
            selection = {'mode': 'exact_ids', 'selected': len(selected_ids)}

        pricing = default_pricing()
        if options['input_price_per_1m'] is not None:
            try:
                pricing = pricing.with_input_rate(options['input_price_per_1m'])
            except ValueError as error:
                raise CommandError(f'invalid --input-price-per-1m: {error}')
        try:
            config = BackfillRunConfig(
                after_id=after_id, limit=options['limit'],
                batch_size=options['batch_size'], delay_ms=options['delay_ms'],
                progress_every=options['progress_every'],
                max_retry_ids=options['max_retry_ids'])
        except ValueError as error:
            raise CommandError(f'invalid option: {error}')

        report_path = options['report']
        if report_path is not None:
            _validate_report_path(report_path)

        def emit(event: dict) -> None:
            if event.get('event') == 'final_summary' and selection is not None:
                event = {**event, 'selection': selection}
            self.stdout.write(json.dumps(event, sort_keys=True,
                                         separators=(',', ':'), default=str))

        if selection is not None:
            emit({'event': 'selection', **selection})
            fetch_page = lambda cursor, size: _fetch_exact_page(
                selected_ids, cursor, size)
        else:
            fetch_page = lambda cursor, size: _fetch_page(cursor, size)

        summary = run_backfill(fetch_page=fetch_page,
                               classify=classify_content_item,
                               config=config, pricing=pricing, emit=emit)
        if selection is not None:
            if summary['scanned'] != selection['selected']:
                raise CommandError(
                    'exact-ID run ended before every preflight selection was '
                    'processed; no report was written')
            summary = {**summary, 'selection': selection}
        if report_path is not None:
            try:
                _write_report_atomic(report_path, summary)
            except CommandError:
                raise
            except OSError as error:
                raise CommandError(f'cannot write --report: {error}')
