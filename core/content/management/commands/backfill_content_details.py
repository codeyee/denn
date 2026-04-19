"""
First-time backfill of per-type ContentDetail rows.

Iterates `ContentItem` rows that DO NOT yet have a Detail row of the
matching type, fetches the payload from the proxy via the shared
orchestration entry point `ensure_content_detail`, and persists.

Use this once after deploying Sprint 07 to cover items that pre-date the
Detail tables. Periodic refreshes belong to `rehydrate_content_details`.

Args:
  --content-type=ALL|MOVIE|TV_SHOW|SEASON|ALBUM|GAME|BOOK
  --limit=N         Per content_type cap. Default: 500.
  --dry-run         Print planned work, don't write.
  --workers=K       Parallel proxy fetches per content_type. Default: 4.
"""
from __future__ import annotations

import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from typing import Iterable, List, Optional

from django.core.management.base import BaseCommand, CommandError

from content.models import ContentItem
from content.services.local_content_store import ensure_content_detail


logger = logging.getLogger(__name__)


_DEFAULT_LIMIT = 500
_DEFAULT_WORKERS = 4
_VALID_TYPES = [c.value for c in ContentItem.ContentType]
_DETAIL_RELATED = {
    ContentItem.ContentType.MOVIE: 'movie_detail',
    ContentItem.ContentType.TV_SHOW: 'tv_show_detail',
    ContentItem.ContentType.SEASON: 'season_detail',
    ContentItem.ContentType.ALBUM: 'album_detail',
    ContentItem.ContentType.GAME: 'game_detail',
    ContentItem.ContentType.BOOK: 'book_detail',
}


@dataclass
class _TypeStats:
    content_type: str
    total: int = 0
    backfilled: int = 0
    skipped: int = 0
    errors: int = 0
    latency_ms: int = 0
    error_samples: List[str] = field(default_factory=list)

    def as_event(self) -> dict:
        return {
            'event': 'backfill',
            'content_type': self.content_type,
            'total': self.total,
            'backfilled': self.backfilled,
            'skipped': self.skipped,
            'errors': self.errors,
            'latency_ms': self.latency_ms,
        }


class Command(BaseCommand):
    help = 'Backfill ContentDetail rows for ContentItems that lack one.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--content-type', type=str, default='ALL',
            help=f'Restrict to one content_type ({", ".join(_VALID_TYPES)}) or ALL (default).',
        )
        parser.add_argument(
            '--limit', type=int, default=_DEFAULT_LIMIT,
            help=f'Max items to process per content_type (default: {_DEFAULT_LIMIT}).',
        )
        parser.add_argument(
            '--dry-run', action='store_true',
            help='Print planned work without calling the proxy or writing.',
        )
        parser.add_argument(
            '--workers', type=int, default=_DEFAULT_WORKERS,
            help=f'Parallel proxy fetches per content_type (default: {_DEFAULT_WORKERS}).',
        )

    def handle(self, *args, **options):
        ctype_arg: str = (options['content_type'] or 'ALL').upper()
        if ctype_arg != 'ALL' and ctype_arg not in _VALID_TYPES:
            raise CommandError(
                f'Invalid --content-type {ctype_arg!r}. '
                f'Use one of: ALL, {", ".join(_VALID_TYPES)}.'
            )

        types_to_run = _VALID_TYPES if ctype_arg == 'ALL' else [ctype_arg]
        workers = max(1, int(options['workers']))
        limit = max(1, int(options['limit']))
        dry_run = bool(options['dry_run'])

        for ct in types_to_run:
            self._run_one_type(
                content_type=ct, limit=limit, workers=workers, dry_run=dry_run,
            )

    def _run_one_type(
        self, *, content_type: str, limit: int, workers: int, dry_run: bool,
    ) -> _TypeStats:
        items = self._select_missing_detail(content_type, limit)
        stats = _TypeStats(content_type=content_type, total=len(items))
        prefix = f'[{content_type}]'
        self.stdout.write(self.style.NOTICE(
            f'{prefix} {len(items)} item(s) without Detail (limit={limit}, dry_run={dry_run})'
        ))

        if not items:
            self._log(stats)
            return stats

        if dry_run:
            for it in items:
                self.stdout.write(f'  would backfill content_item={it.id} external_id={it.external_id}')
            self._log(stats)
            return stats

        started = time.monotonic()
        results: Iterable
        if workers <= 1:
            results = ((it, self._safe_backfill(it)) for it in items)
        else:
            def _generate():
                with ThreadPoolExecutor(max_workers=workers) as executor:
                    futures = {executor.submit(self._safe_backfill, it): it for it in items}
                    for fut in as_completed(futures):
                        yield futures[fut], fut.result()
            results = _generate()

        for it, outcome in results:
            ok, did_write, exc = outcome
            if not ok:
                stats.errors += 1
                if len(stats.error_samples) < 5:
                    stats.error_samples.append(f'{it.id}: {exc!r}')
                continue
            if did_write:
                stats.backfilled += 1
            else:
                stats.skipped += 1

        stats.latency_ms = int((time.monotonic() - started) * 1000)
        self._log(stats)
        self.stdout.write(self.style.SUCCESS(
            f'{prefix} done: backfilled={stats.backfilled} skipped={stats.skipped} '
            f'errors={stats.errors} in {stats.latency_ms}ms'
        ))
        if stats.error_samples:
            for line in stats.error_samples:
                self.stdout.write(self.style.WARNING(f'  ! {line}'))
        return stats

    @staticmethod
    def _safe_backfill(item: ContentItem):
        try:
            return True, ensure_content_detail(item, force=True), None
        except Exception as exc:
            logger.exception(
                'backfill_content_details: failed for content_item=%s', item.id,
            )
            return False, False, exc

    @staticmethod
    def _select_missing_detail(content_type: str, limit: int) -> List[ContentItem]:
        related = _DETAIL_RELATED.get(content_type)
        if not related:
            return []
        qs = (
            ContentItem.objects
            .filter(content_type=content_type, **{f'{related}__isnull': True})
            .order_by('id')[:limit]
        )
        return list(qs)

    def _log(self, stats: _TypeStats) -> None:
        try:
            self.stdout.write(json.dumps(stats.as_event(), separators=(',', ':')))
        except Exception:
            self.stdout.write(str(stats.as_event()))
