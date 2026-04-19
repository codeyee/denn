"""
Rehydrate per-type ContentDetail rows that are older than the TTL.

Iterates the local Detail tables (one per content_type), finds rows whose
`last_refreshed_at` is older than `settings.CONTENT_REHYDRATION_TTL[type]`
(or `--ttl-override` days), and re-fetches each from the proxy via the
shared orchestration entry point `ensure_content_detail`.

This is the periodic refresh job. The first-time backfill of items that
have NO Detail row at all lives in `backfill_content_details` (PR-7E).

Args:
  --content-type=ALL|MOVIE|TV_SHOW|SEASON|ALBUM|GAME|BOOK
  --limit=N         Per content_type cap. Default: 200.
  --dry-run         Print planned work, don't write.
  --ttl-override=D  Use D days as the TTL instead of the per-type setting.
  --workers=K       Parallel proxy fetches per content_type. Default: 4.

Emits one structured log line per content_type with the same
`event=rehydrate` shape used by the Sprint 6C metrics scaffolding so
observability tooling can chart hit ratios over time.
"""
from __future__ import annotations

import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Iterable, List, Optional

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from content.models import ContentItem
from content.services.local_content_store import (
    detail_for,
    ensure_content_detail,
)


logger = logging.getLogger(__name__)


_DEFAULT_LIMIT = 200
_DEFAULT_WORKERS = 4
_VALID_TYPES = [c.value for c in ContentItem.ContentType]


@dataclass
class _TypeStats:
    content_type: str
    total: int = 0
    refreshed: int = 0
    unchanged: int = 0
    errors: int = 0
    latency_ms: int = 0
    error_samples: List[str] = field(default_factory=list)

    def as_event(self) -> dict:
        return {
            'event': 'rehydrate',
            'content_type': self.content_type,
            'total': self.total,
            'refreshed': self.refreshed,
            'unchanged': self.unchanged,
            'errors': self.errors,
            'latency_ms': self.latency_ms,
        }


class Command(BaseCommand):
    help = 'Rehydrate stale ContentDetail rows from the proxy.'

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
            '--ttl-override', type=int, default=None, metavar='DAYS',
            help='Override the per-type TTL with this number of days.',
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
        ttl_override = (
            timedelta(days=options['ttl_override'])
            if options['ttl_override'] is not None
            else None
        )
        workers = max(1, int(options['workers']))
        limit = max(1, int(options['limit']))
        dry_run = bool(options['dry_run'])

        for ct in types_to_run:
            self._run_one_type(
                content_type=ct,
                limit=limit,
                workers=workers,
                ttl_override=ttl_override,
                dry_run=dry_run,
            )

    def _run_one_type(
        self,
        *,
        content_type: str,
        limit: int,
        workers: int,
        ttl_override: Optional[timedelta],
        dry_run: bool,
    ) -> _TypeStats:
        items = self._select_stale_items(content_type, limit, ttl_override)
        stats = _TypeStats(content_type=content_type, total=len(items))

        prefix = f'[{content_type}]'
        self.stdout.write(self.style.NOTICE(
            f'{prefix} {len(items)} stale item(s) (limit={limit}, dry_run={dry_run}, '
            f'ttl_override={ttl_override})'
        ))

        if not items:
            self._log(stats)
            return stats

        if dry_run:
            for it in items:
                self.stdout.write(f'  would refresh content_item={it.id} external_id={it.external_id}')
            self._log(stats)
            return stats

        started = time.monotonic()
        results: Iterable
        if workers <= 1:
            # Inline path: no executor. Avoids holding extra DB connections
            # and lets SQLite-backed tests run without table-lock contention.
            results = ((it, self._safe_refresh(it)) for it in items)
        else:
            def _generate():
                with ThreadPoolExecutor(max_workers=workers) as executor:
                    futures = {executor.submit(self._safe_refresh, it): it for it in items}
                    for fut in as_completed(futures):
                        yield futures[fut], fut.result()
            results = _generate()

        for it, outcome in results:
            ok, refreshed, exc = outcome
            if not ok:
                stats.errors += 1
                if len(stats.error_samples) < 5:
                    stats.error_samples.append(f'{it.id}: {exc!r}')
                continue
            if refreshed:
                stats.refreshed += 1
            else:
                stats.unchanged += 1

        stats.latency_ms = int((time.monotonic() - started) * 1000)
        self._log(stats)
        self.stdout.write(self.style.SUCCESS(
            f'{prefix} done: refreshed={stats.refreshed} unchanged={stats.unchanged} '
            f'errors={stats.errors} in {stats.latency_ms}ms'
        ))
        if stats.error_samples:
            for line in stats.error_samples:
                self.stdout.write(self.style.WARNING(f'  ! {line}'))
        return stats

    @staticmethod
    def _safe_refresh(item: ContentItem):
        try:
            return True, ensure_content_detail(item, force=True), None
        except Exception as exc:
            logger.exception(
                'rehydrate_content_details: failed for content_item=%s', item.id,
            )
            return False, False, exc

    @staticmethod
    def _select_stale_items(
        content_type: str,
        limit: int,
        ttl_override: Optional[timedelta],
    ) -> List[ContentItem]:
        ttls: dict = getattr(settings, 'CONTENT_REHYDRATION_TTL', {})
        ttl = ttl_override or ttls.get(content_type, timedelta(days=30))
        cutoff = timezone.now() - ttl

        related_name = {
            ContentItem.ContentType.MOVIE: 'movie_detail',
            ContentItem.ContentType.TV_SHOW: 'tv_show_detail',
            ContentItem.ContentType.SEASON: 'season_detail',
            ContentItem.ContentType.ALBUM: 'album_detail',
            ContentItem.ContentType.GAME: 'game_detail',
            ContentItem.ContentType.BOOK: 'book_detail',
        }.get(content_type)

        if not related_name:
            return []

        filter_kwargs = {f'{related_name}__last_refreshed_at__lt': cutoff}
        order_field = f'{related_name}__last_refreshed_at'

        qs = (
            ContentItem.objects
            .filter(content_type=content_type, **filter_kwargs)
            .order_by(order_field)[:limit]
        )
        return list(qs)

    def _log(self, stats: _TypeStats) -> None:
        # Emit a single structured line for observability scrapers.
        try:
            self.stdout.write(json.dumps(stats.as_event(), separators=(',', ':')))
        except Exception:
            self.stdout.write(str(stats.as_event()))
