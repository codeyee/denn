import json
import re
from collections import defaultdict

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Count

from authentication.models import UserPublicProfile
from content.models import (
    ContentItem,
    ListItem,
    Rating,
    SeasonDetail,
    UserContentTracking,
)


USERNAME_PATTERN = re.compile(r"^[a-z0-9._-]+$")


class Command(BaseCommand):
    help = "Backfill public profiles, season parents and canonical tracking."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--apply", action="store_true")

    def handle(self, *args, **options):
        if options["dry_run"] == options["apply"]:
            raise CommandError("Choose exactly one mode: --dry-run or --apply.")

        with transaction.atomic():
            report = self._run(apply=True)
            if not options["apply"]:
                transaction.set_rollback(True)

        report["mode"] = "apply" if options["apply"] else "dry-run"
        self.stdout.write(json.dumps(report, sort_keys=True))

    def _run(self, *, apply):
        report = self._base_report()
        report["profiles_created"] = self._backfill_profiles(apply=apply)
        report["season_parents_linked"] = self._backfill_season_parents(apply=apply)

        ratings_seeded, rating_parent_gaps = self._seed_from_ratings(apply=apply)
        lists_seeded, list_parent_gaps = self._seed_from_personal_lists(apply=apply)
        report["tracking_seeded_from_ratings"] = ratings_seeded
        report["tracking_seeded_from_personal_lists"] = lists_seeded
        report["seasons_without_parent"] = sorted(
            set(rating_parent_gaps + list_parent_gaps + self._season_parent_gaps())
        )
        return report

    def _base_report(self):
        malformed_usernames = list(
            User.objects.order_by("id").values_list("id", "username")
        )
        malformed_usernames = [
            {"id": user_id, "username": username}
            for user_id, username in malformed_usernames
            if not USERNAME_PATTERN.fullmatch(username)
        ]
        case_collisions = list(
            User.objects.extra(select={"normalized": "LOWER(username)"})
            .values("normalized")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .order_by("normalized")
        )
        content_duplicates = list(
            ContentItem.objects.values("source_api", "external_id", "content_type")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .order_by("source_api", "external_id", "content_type")
        )
        rating_duplicates = list(
            Rating.objects.values("user_id", "content_item_id")
            .annotate(count=Count("id"))
            .filter(count__gt=1)
            .order_by("user_id", "content_item_id")
        )
        metadata_missing = list(
            ContentItem.objects.filter(browse_meta__isnull=True)
            .order_by("id")
            .values_list("id", flat=True)
        )
        shared_rows_omitted = ListItem.objects.filter(
            user_list__list_type="SHARED",
            status=ListItem.Status.COMPLETED,
        ).count()

        return {
            "username_anomalies": malformed_usernames,
            "username_case_collisions": case_collisions,
            "content_duplicates": content_duplicates,
            "rating_duplicates": rating_duplicates,
            "metadata_missing": metadata_missing,
            "shared_completed_rows_omitted": shared_rows_omitted,
        }

    def _backfill_profiles(self, *, apply):
        missing_ids = list(
            User.objects.filter(public_profile__isnull=True)
            .order_by("id")
            .values_list("id", flat=True)
        )
        if apply:
            UserPublicProfile.objects.bulk_create(
                [UserPublicProfile(user_id=user_id) for user_id in missing_ids],
                ignore_conflicts=True,
            )
        return len(missing_ids)

    def _backfill_season_parents(self, *, apply):
        linked = 0
        for detail in SeasonDetail.objects.filter(tv_show__isnull=True).select_related(
            "content_item"
        ):
            parent = self._find_parent(detail.content_item)
            if parent is None:
                continue
            linked += 1
            if apply:
                detail.tv_show = parent
                detail.save(update_fields=["tv_show"])
        return linked

    def _seed_from_ratings(self, *, apply):
        seeded = 0
        parent_gaps = []
        for rating in Rating.objects.select_related(
            "user",
            "content_item",
            "content_item__season_detail__tv_show",
        ).order_by("created_at", "id"):
            canonical = self._canonical_content(rating.content_item)
            if canonical is None:
                parent_gaps.append(rating.content_item_id)
                continue
            if self._ensure_completed_tracking(
                user=rating.user,
                content_item=canonical,
                completed_at=rating.created_at,
                apply=apply,
            ):
                seeded += 1
        return seeded, parent_gaps

    def _seed_from_personal_lists(self, *, apply):
        earliest = defaultdict(lambda: None)
        parent_gaps = []
        items = ListItem.objects.filter(
            user_list__list_type="PERSONAL",
            status=ListItem.Status.COMPLETED,
        ).select_related(
            "user_list__owner",
            "content_item",
            "content_item__season_detail__tv_show",
        )
        for item in items.order_by("completed_at", "added_at", "id"):
            canonical = self._canonical_content(item.content_item)
            if canonical is None:
                parent_gaps.append(item.content_item_id)
                continue
            key = (item.user_list.owner_id, canonical.id)
            evidence_at = item.completed_at or item.added_at
            previous = earliest[key]
            if previous is None or evidence_at < previous:
                earliest[key] = evidence_at

        users = User.objects.in_bulk({user_id for user_id, _content_id in earliest})
        content_items = ContentItem.objects.in_bulk(
            {content_id for _user_id, content_id in earliest}
        )
        seeded = 0
        for (user_id, content_id), completed_at in sorted(earliest.items()):
            if self._ensure_completed_tracking(
                user=users[user_id],
                content_item=content_items[content_id],
                completed_at=completed_at,
                apply=apply,
            ):
                seeded += 1
        return seeded, parent_gaps

    def _ensure_completed_tracking(
        self,
        *,
        user,
        content_item,
        completed_at,
        apply,
    ):
        existing = UserContentTracking.objects.filter(
            user=user,
            content_item=content_item,
        ).first()
        if existing is not None:
            if (
                apply
                and existing.status == UserContentTracking.Status.COMPLETED
                and (
                    existing.last_completed_at is None
                    or completed_at < existing.last_completed_at
                )
            ):
                existing.last_completed_at = completed_at
                existing.save(update_fields=["last_completed_at", "updated_at"])
            return False

        if apply:
            UserContentTracking.objects.create(
                user=user,
                content_item=content_item,
                status=UserContentTracking.Status.COMPLETED,
                last_completed_at=completed_at,
            )
        return True

    def _canonical_content(self, content_item):
        if content_item.content_type != ContentItem.ContentType.SEASON:
            return content_item
        try:
            return content_item.season_detail.tv_show
        except Exception:
            return None

    def _season_parent_gaps(self):
        return list(
            SeasonDetail.objects.filter(tv_show__isnull=True)
            .order_by("content_item_id")
            .values_list("content_item_id", flat=True)
        )

    def _find_parent(self, season):
        tv_external_id, separator, _season_number = season.external_id.partition(":")
        if not separator or not tv_external_id:
            return None
        return ContentItem.objects.filter(
            source_api=season.source_api,
            external_id=tv_external_id,
            content_type=ContentItem.ContentType.TV_SHOW,
        ).first()
