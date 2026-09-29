"""Populate or recompute moderation freshness hashes from persisted Core detail.

Both modes read local normalized detail only: no Jev call and no Proxy call.
Run with `--recompute` after any change to the moderation state builder (which
ships with a question-revision bump), before classification workers run: every
materialized hash was computed from the previous state shape.
"""
from __future__ import annotations

from argparse import ArgumentTypeError

from django.core.management.base import BaseCommand
from django.db import transaction

from content.models import ContentItem
from content.services.moderation_source_hash import persist_current_moderation_source_hash


def _positive_int(raw):
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise ArgumentTypeError("must be a positive integer")
    if value <= 0:
        raise ArgumentTypeError("must be a positive integer")
    return value


def _non_negative_int(raw):
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise ArgumentTypeError("must be a non-negative integer")
    if value < 0:
        raise ArgumentTypeError("must be a non-negative integer")
    return value


class Command(BaseCommand):
    help = (
        "Populate missing current moderation hashes from local normalized detail "
        "only, or with --recompute refresh the existing ones."
    )

    def add_arguments(self, parser):
        parser.add_argument("--limit", type=_positive_int, required=True)
        parser.add_argument("--after-id", type=_non_negative_int, default=0)
        parser.add_argument(
            "--recompute",
            action="store_true",
            help=(
                "Recompute hashes that already exist instead of filling missing "
                "ones. Idempotent; run after a moderation state or question "
                "revision change, before classification workers run."
            ),
        )

    def handle(self, *args, **options):
        limit = options["limit"]
        after_id = options["after_id"]
        if options["recompute"]:
            self._recompute(limit, after_id)
        else:
            self._populate_missing(limit, after_id)

    def _populate_missing(self, limit, after_id):
        item_ids = list(
            ContentItem.objects.filter(
                pk__gt=after_id,
                current_moderation_source_hash__isnull=True,
            )
            .order_by("pk")
            .values_list("pk", flat=True)[:limit]
        )

        updated = 0
        unverified = 0
        for item_id in item_ids:
            with transaction.atomic():
                item = ContentItem.objects.select_for_update().get(pk=item_id)
                if item.current_moderation_source_hash is not None:
                    continue
                if persist_current_moderation_source_hash(item) is None:
                    unverified += 1
                else:
                    updated += 1

        self.stdout.write(
            f"examined={len(item_ids)} updated={updated} unverified={unverified} "
            f"next_after_id={item_ids[-1] if item_ids else after_id}"
        )

    def _recompute(self, limit, after_id):
        item_ids = list(
            ContentItem.objects.filter(
                pk__gt=after_id,
                current_moderation_source_hash__isnull=False,
            )
            .order_by("pk")
            .values_list("pk", flat=True)[:limit]
        )

        changed = 0
        unchanged = 0
        unverified = 0
        for item_id in item_ids:
            with transaction.atomic():
                item = ContentItem.objects.select_for_update().filter(pk=item_id).first()
                if item is None:
                    continue
                previous = item.current_moderation_source_hash
                current = persist_current_moderation_source_hash(item)
                if current is None:
                    unverified += 1
                elif current == previous:
                    unchanged += 1
                else:
                    changed += 1

        self.stdout.write(
            f"examined={len(item_ids)} changed={changed} unchanged={unchanged} "
            f"unverified={unverified} "
            f"next_after_id={item_ids[-1] if item_ids else after_id}"
        )
