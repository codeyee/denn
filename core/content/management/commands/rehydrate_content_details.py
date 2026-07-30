"""Rehydrate stale details and optionally repair resolved game durations."""
from __future__ import annotations

import json
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Iterable, List, Optional

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Exists, OuterRef, Q
from django.db.models.functions import Now

from content.models import ContentItem, GameDurationEstimate
from content.services.local_content_store import (
    detail_for,
    ensure_content_detail,
)
from content.services.local_content_store.refresh_policy import (
    DETAIL_RELATED_NAME,
    build_age_band_expression,
    build_refresh_due_at_expression,
    compute_refresh_policy,
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
    by_band: dict = field(default_factory=dict)

    def as_event(self) -> dict:
        return {
            'event': 'rehydrate',
            'content_type': self.content_type,
            'total': self.total,
            'refreshed': self.refreshed,
            'unchanged': self.unchanged,
            'errors': self.errors,
            'latency_ms': self.latency_ms,
            'by_band': self.by_band,
        }


class Command(BaseCommand):
    help = 'Rehydrate stale or incomplete ContentDetail rows from the proxy.'

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
        parser.add_argument(
            '--include-no-data', action='store_true',
            help='Reprocess existing IGDB game duration rows with no_data (one-off repair).',
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
        include_no_data = bool(options['include_no_data'])

        for ct in types_to_run:
            self._run_one_type(
                content_type=ct,
                limit=limit,
                workers=workers,
                ttl_override=ttl_override,
                dry_run=dry_run,
                include_no_data=include_no_data,
            )

    def _run_one_type(
        self,
        *,
        content_type: str,
        limit: int,
        workers: int,
        ttl_override: Optional[timedelta],
        dry_run: bool,
        include_no_data: bool,
    ) -> _TypeStats:
        items = self._select_stale_items(
            content_type,
            limit,
            ttl_override,
            include_no_data=include_no_data,
        )
        stats = _TypeStats(content_type=content_type, total=len(items))

        prefix = f'[{content_type}]'
        self.stdout.write(self.style.NOTICE(
            f'{prefix} {len(items)} refresh candidate(s) (limit={limit}, dry_run={dry_run}, '
            f'ttl_override={ttl_override}, include_no_data={include_no_data})'
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
            ok, refreshed, exc, policy = outcome
            band = policy.age_band if policy is not None else 'unknown'
            bucket = stats.by_band.setdefault(
                band,
                {'total': 0, 'refreshed': 0, 'unchanged': 0, 'errors': 0},
            )
            bucket['total'] += 1
            if not ok:
                stats.errors += 1
                bucket['errors'] += 1
                if len(stats.error_samples) < 5:
                    stats.error_samples.append(f'{it.id}: {exc!r}')
                continue
            if refreshed:
                stats.refreshed += 1
                bucket['refreshed'] += 1
            else:
                stats.unchanged += 1
                bucket['unchanged'] += 1

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
            detail = detail_for(item)
            policy = compute_refresh_policy(item, detail)
            logger.info(
                'rehydrate_item',
                extra={
                    'event': 'rehydrate_item',
                    'content_type': item.content_type,
                    'content_item_id': item.id,
                    'age_band': policy.age_band,
                    'age_days': policy.age_days,
                    'ttl_days': policy.ttl.days,
                },
            )
            return True, ensure_content_detail(item, force=True), None, policy
        except Exception as exc:
            logger.exception(
                'rehydrate_content_details: failed for content_item=%s', item.id,
            )
            return False, False, exc, None

    @staticmethod
    def _select_stale_items(
        content_type: str,
        limit: int,
        ttl_override: Optional[timedelta],
        *,
        include_no_data: bool = False,
    ) -> List[ContentItem]:
        related_name = DETAIL_RELATED_NAME.get(content_type)

        if not related_name:
            return []

        qs = (
            ContentItem.objects
            .filter(
                content_type=content_type,
                **{f'{related_name}__isnull': False},
            )
            .annotate(
                refresh_due_at=build_refresh_due_at_expression(
                    content_type,
                    related_name=related_name,
                    ttl_override=ttl_override,
                ),
                refresh_age_band=build_age_band_expression(
                    content_type,
                    related_name=related_name,
                ),
            )
            .select_related(related_name)
        )
        if content_type == ContentItem.ContentType.GAME:
            has_game_duration = GameDurationEstimate.objects.filter(
                content_item_id=OuterRef('pk'),
                provider=GameDurationEstimate.Provider.IGDB,
            )
            qs = qs.annotate(has_game_duration=Exists(has_game_duration))
            selection = Q(refresh_due_at__lt=Now()) | Q(has_game_duration=False)
            if include_no_data:
                has_no_data_duration = GameDurationEstimate.objects.filter(
                    content_item_id=OuterRef('pk'),
                    provider=GameDurationEstimate.Provider.IGDB,
                    status=GameDurationEstimate.Status.NO_DATA,
                )
                qs = qs.annotate(
                    has_no_data_duration=Exists(has_no_data_duration),
                )
                selection |= Q(has_no_data_duration=True)
            qs = qs.filter(selection)
        else:
            qs = qs.filter(refresh_due_at__lt=Now())
        qs = qs.order_by('refresh_due_at')[:limit]
        return list(qs)

    def _log(self, stats: _TypeStats) -> None:
        # Emit a single structured line for observability scrapers.
        try:
            self.stdout.write(json.dumps(stats.as_event(), separators=(',', ':')))
        except Exception:
            self.stdout.write(str(stats.as_event()))
