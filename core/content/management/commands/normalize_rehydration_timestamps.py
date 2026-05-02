from __future__ import annotations

import json
import random
from collections import defaultdict
from datetime import timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from content.models import ContentItem
from content.services.local_content_store import detail_for
from content.services.local_content_store.refresh_policy import (
    DETAIL_RELATED_NAME,
    compute_refresh_policy,
)


_VALID_TYPES = [c.value for c in ContentItem.ContentType]


class Command(BaseCommand):
    help = "Report or stagger fresh rehydration timestamps after policy changes."

    def add_arguments(self, parser):
        parser.add_argument("--content-type", type=str, default="ALL")
        parser.add_argument("--apply", action="store_true")
        parser.add_argument("--stagger-hours", type=int, default=24)

    def handle(self, *args, **options):
        ctype_arg = (options["content_type"] or "ALL").upper()
        if ctype_arg != "ALL" and ctype_arg not in _VALID_TYPES:
            raise CommandError(
                f'Invalid --content-type {ctype_arg!r}. '
                f'Use one of: ALL, {", ".join(_VALID_TYPES)}.'
            )

        apply_updates = bool(options["apply"])
        stagger_hours = max(1, int(options["stagger_hours"]))
        now = timezone.now()
        stats = defaultdict(lambda: {"total": 0, "stale": 0, "staggered": 0})

        content_types = _VALID_TYPES if ctype_arg == "ALL" else [ctype_arg]
        for content_type in content_types:
            related_name = DETAIL_RELATED_NAME.get(content_type)
            if not related_name:
                continue

            items = ContentItem.objects.filter(
                content_type=content_type,
                **{f"{related_name}__isnull": False},
            ).select_related(related_name)

            for item in items:
                detail = detail_for(item)
                if detail is None:
                    continue
                policy = compute_refresh_policy(item, detail, now=now)
                stats[policy.age_band]["total"] += 1
                refresh_due_at = detail.last_refreshed_at + policy.ttl
                if refresh_due_at < now:
                    stats[policy.age_band]["stale"] += 1
                    continue
                if not apply_updates:
                    continue

                seconds = random.randint(0, stagger_hours * 3600)
                target = now - timedelta(seconds=seconds)
                detail.__class__.objects.filter(pk=detail.pk).update(
                    last_refreshed_at=max(target, now - policy.ttl + timedelta(minutes=1)),
                )
                stats[policy.age_band]["staggered"] += 1

        self.stdout.write(
            json.dumps(
                {
                    "event": "normalize_rehydration_timestamps",
                    "apply": apply_updates,
                    "stagger_hours": stagger_hours,
                    "by_band": stats,
                },
                default=dict,
                separators=(",", ":"),
            )
        )
