"""
Backfill `ContentItemBrowseMetadata` from the Go proxy (Sprint 4.5B).

Iterates content items that are missing browse metadata (or whose metadata
is older than the TTL) and refreshes them by calling the proxy in bulk.

Idempotent. Supports `--limit`, `--dry-run`, `--content-type`,
`--include-stale` (default: only missing rows) and `--rebuild` (reprocess
every row regardless of freshness; use after a mapper change to fix
rows that were upserted with the wrong field schema).

Usage:
  manage.py backfill_browse_metadata --limit 500
  manage.py backfill_browse_metadata --content-type ALBUM
  manage.py backfill_browse_metadata --include-stale --dry-run
  manage.py backfill_browse_metadata --rebuild         # all items

Note: this is the manual entry point for the rehydration system. A future
sprint should add a periodic worker (cron/celery) that calls the same
upsert path automatically.
"""
from __future__ import annotations

import time
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.db.models import Q
from django.utils import timezone

from content.models import ContentItem
from content.services.browse_metadata_service import (
    BROWSE_METADATA_TTL,
    upsert_browse_metadata,
)
from content.utils import bulk_fetch_source_data


CHUNK_SIZE = 50


class Command(BaseCommand):
    help = 'Backfill or refresh ContentItemBrowseMetadata from the proxy.'

    def add_arguments(self, parser):
        parser.add_argument('--limit', type=int, default=None, help='Max number of items to process')
        parser.add_argument('--dry-run', action='store_true', help='Do not write to the database')
        parser.add_argument(
            '--content-type', type=str, default=None,
            help=f'Restrict to a content_type ({", ".join(c.value for c in ContentItem.ContentType)})',
        )
        parser.add_argument(
            '--include-stale', action='store_true',
            help=f'Also refresh rows older than the TTL ({BROWSE_METADATA_TTL.days} days)',
        )
        parser.add_argument(
            '--rebuild', action='store_true',
            help='Reprocess every content item regardless of freshness (use after mapper changes)',
        )
        parser.add_argument('--ttl-days', type=int, default=BROWSE_METADATA_TTL.days)

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']
        ctype = options['content_type']
        include_stale = options['include_stale']
        rebuild = options['rebuild']
        ttl = timedelta(days=options['ttl_days'])

        qs = ContentItem.objects.all()

        if rebuild:
            pass  # All items.
        elif include_stale:
            cutoff = timezone.now() - ttl
            qs = qs.filter(
                Q(browse_meta__isnull=True) | Q(browse_meta__last_refreshed_at__lt=cutoff)
            )
        else:
            qs = qs.filter(browse_meta__isnull=True)

        if ctype:
            qs = qs.filter(content_type=ctype)

        qs = qs.order_by('id')
        if limit:
            qs = qs[:limit]

        items = list(qs)
        total = len(items)
        self.stdout.write(self.style.NOTICE(
            f'Processing {total} content item(s) (dry_run={dry_run}, '
            f'rebuild={rebuild}, include_stale={include_stale}, '
            f'content_type={ctype or "<any>"})'
        ))

        if not items:
            return

        written = 0
        skipped = 0
        started = time.monotonic()
        for chunk_start in range(0, total, CHUNK_SIZE):
            chunk = items[chunk_start:chunk_start + CHUNK_SIZE]
            payloads = bulk_fetch_source_data(chunk)
            for item in chunk:
                payload = payloads.get(item.id)
                if not payload:
                    skipped += 1
                    continue
                if dry_run:
                    written += 1
                    continue
                if upsert_browse_metadata(item, payload):
                    written += 1
                else:
                    skipped += 1

            self.stdout.write(
                f'  processed {min(chunk_start + CHUNK_SIZE, total)}/{total} '
                f'(written={written}, skipped={skipped})'
            )

        elapsed = time.monotonic() - started
        self.stdout.write(self.style.SUCCESS(
            f'Done in {elapsed:.1f}s. written={written}, skipped={skipped}, total={total}'
        ))
