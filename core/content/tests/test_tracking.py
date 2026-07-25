import json
import threading
from io import StringIO

from django.contrib.auth.models import User
from django.core.management import call_command
from django.db import close_old_connections
from django.test import TestCase, TransactionTestCase, skipUnlessDBFeature
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APITestCase

from content.models import (
    ContentItem,
    ListItem,
    Rating,
    SeasonDetail,
    UserContentTracking,
    UserList,
)
from content.services.tracking_service import (
    delete_tracking,
    save_rating,
    set_favorite,
    transition_tracking,
)
from core.exceptions import APIError


class TrackingServiceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="tracker", password="secret")
        self.movie = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="550",
            content_type=ContentItem.ContentType.MOVIE,
        )

    def test_rating_completes_and_transitions_preserve_then_reactivate(self):
        rating = save_rating(
            user=self.user,
            content_item=self.movie,
            score="8.5",
            comment="Great",
            spoiler=True,
        )
        tracking = UserContentTracking.objects.get(
            user=self.user,
            content_item=self.movie,
        )
        self.assertEqual(tracking.status, UserContentTracking.Status.COMPLETED)
        self.assertTrue(rating.is_active)
        self.assertTrue(rating.spoiler)

        set_favorite(
            user=self.user,
            content_item=self.movie,
            is_favorite=True,
        )
        transition_tracking(
            user=self.user,
            content_item=self.movie,
            status=UserContentTracking.Status.IN_PROGRESS,
        )
        rating.refresh_from_db()
        tracking.refresh_from_db()
        self.assertFalse(rating.is_active)
        self.assertTrue(tracking.is_favorite)

        result = transition_tracking(
            user=self.user,
            content_item=self.movie,
            status=UserContentTracking.Status.COMPLETED,
        )
        rating.refresh_from_db()
        self.assertTrue(rating.is_active)
        self.assertFalse(result.should_prompt_rating)

        self.assertTrue(
            delete_tracking(user=self.user, content_item=self.movie)
        )
        rating.refresh_from_db()
        self.assertFalse(rating.is_active)
        self.assertFalse(
            UserContentTracking.objects.filter(
                user=self.user,
                content_item=self.movie,
            ).exists()
        )

    def test_completed_without_rating_requests_prompt(self):
        result = transition_tracking(
            user=self.user,
            content_item=self.movie,
            status=UserContentTracking.Status.COMPLETED,
        )
        self.assertTrue(result.should_prompt_rating)
        self.assertIsNotNone(result.tracking.last_completed_at)

    def test_spoiler_is_forced_off_without_review(self):
        rating = save_rating(
            user=self.user,
            content_item=self.movie,
            score="7.0",
            comment=" ",
            spoiler=True,
        )
        self.assertEqual(rating.comment, "")
        self.assertFalse(rating.spoiler)

    def test_inactive_rating_does_not_contribute_to_global_aggregate(self):
        save_rating(
            user=self.user,
            content_item=self.movie,
            score="9.0",
            comment="Strong",
        )
        self.movie.refresh_from_db()
        self.assertEqual(self.movie.rating_count, 1)

        transition_tracking(
            user=self.user,
            content_item=self.movie,
            status=UserContentTracking.Status.DROPPED,
        )
        self.movie.refresh_from_db()
        self.assertEqual(self.movie.rating_count, 0)
        self.assertIsNone(self.movie.average_rating)

    def test_favorite_limit_counts_preserved_inactive_favorites(self):
        movies = [self.movie]
        movies.extend(
            ContentItem.objects.create(
                source_api=ContentItem.SourceAPI.TMDB,
                external_id=str(external_id),
                content_type=ContentItem.ContentType.MOVIE,
            )
            for external_id in range(551, 556)
        )
        for movie in movies[:5]:
            transition_tracking(
                user=self.user,
                content_item=movie,
                status=UserContentTracking.Status.COMPLETED,
            )
            set_favorite(user=self.user, content_item=movie, is_favorite=True)
        transition_tracking(
            user=self.user,
            content_item=movies[0],
            status=UserContentTracking.Status.DROPPED,
        )
        transition_tracking(
            user=self.user,
            content_item=movies[5],
            status=UserContentTracking.Status.COMPLETED,
        )

        with self.assertRaises(APIError) as raised:
            set_favorite(
                user=self.user,
                content_item=movies[5],
                is_favorite=True,
            )
        self.assertEqual(
            raised.exception.error_code.code,
            "FAVORITE_LIMIT_REACHED",
        )

    def test_season_tracking_canonicalizes_to_local_tv_show(self):
        tv_show = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="1396",
            content_type=ContentItem.ContentType.TV_SHOW,
        )
        season = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="1396:1",
            content_type=ContentItem.ContentType.SEASON,
        )
        SeasonDetail.objects.create(
            content_item=season,
            tv_show=tv_show,
            season_number=1,
        )

        result = transition_tracking(
            user=self.user,
            content_item=season,
            status=UserContentTracking.Status.BACKLOG,
        )
        self.assertEqual(result.tracking.content_item, tv_show)

    def test_season_without_parent_returns_recoverable_error(self):
        season = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="1396:1",
            content_type=ContentItem.ContentType.SEASON,
        )
        SeasonDetail.objects.create(content_item=season, season_number=1)

        with self.assertRaises(APIError) as raised:
            transition_tracking(
                user=self.user,
                content_item=season,
                status=UserContentTracking.Status.BACKLOG,
            )
        self.assertEqual(
            raised.exception.error_code.code,
            "TRACKING_PARENT_MISSING",
        )
        self.assertTrue(raised.exception.extra_data["requires_backfill"])


@skipUnlessDBFeature("has_select_for_update")
class FavoriteConcurrencyTests(TransactionTestCase):
    reset_sequences = True

    def setUp(self):
        self.user = User.objects.create_user(
            username="concurrent-favorite",
            password="secret",
        )
        self.movies = [
            ContentItem.objects.create(
                source_api=ContentItem.SourceAPI.TMDB,
                external_id=str(700 + index),
                content_type=ContentItem.ContentType.MOVIE,
            )
            for index in range(6)
        ]
        for movie in self.movies:
            transition_tracking(
                user=self.user,
                content_item=movie,
                status=UserContentTracking.Status.COMPLETED,
            )
        for movie in self.movies[:4]:
            set_favorite(user=self.user, content_item=movie, is_favorite=True)

    def test_concurrent_favorite_writes_cannot_exceed_quota(self):
        barrier = threading.Barrier(2)
        results = []
        result_lock = threading.Lock()

        def favorite(content_id):
            close_old_connections()
            barrier.wait()
            try:
                set_favorite(
                    user=User.objects.get(pk=self.user.pk),
                    content_item=ContentItem.objects.get(pk=content_id),
                    is_favorite=True,
                )
                result = "ok"
            except APIError as exc:
                result = exc.error_code.code
            finally:
                close_old_connections()
            with result_lock:
                results.append(result)

        threads = [
            threading.Thread(target=favorite, args=(movie.id,))
            for movie in self.movies[4:]
        ]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join(timeout=5)

        self.assertEqual(results.count("ok"), 1)
        self.assertEqual(results.count("FAVORITE_LIMIT_REACHED"), 1)
        self.assertEqual(
            UserContentTracking.objects.filter(
                user=self.user,
                is_favorite=True,
                content_item__content_type=ContentItem.ContentType.MOVIE,
            ).count(),
            5,
        )


class PublicProfileTrackingBackfillTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="legacy", password="secret")
        self.rated_movie = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="1",
            content_type=ContentItem.ContentType.MOVIE,
        )
        self.list_movie = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="2",
            content_type=ContentItem.ContentType.MOVIE,
        )
        Rating.objects.create(
            user=self.user,
            content_item=self.rated_movie,
            score="8.0",
        )
        personal = UserList.objects.create(
            owner=self.user,
            name="Personal",
            list_type=UserList.ListType.PERSONAL,
        )
        ListItem.objects.create(
            user_list=personal,
            content_item=self.list_movie,
            added_by=self.user,
            status=ListItem.Status.COMPLETED,
            completed_at=timezone.now(),
        )
        shared = UserList.objects.create(
            owner=self.user,
            name="Shared",
            list_type=UserList.ListType.SHARED,
        )
        ListItem.objects.create(
            user_list=shared,
            content_item=self.list_movie,
            added_by=self.user,
            status=ListItem.Status.COMPLETED,
        )

    def test_backfill_is_dry_run_safe_and_apply_is_idempotent(self):
        UserContentTracking.objects.all().delete()

        dry_run_output = StringIO()
        call_command(
            "backfill_public_profiles_tracking",
            "--dry-run",
            stdout=dry_run_output,
        )
        dry_run = json.loads(dry_run_output.getvalue())
        self.assertEqual(dry_run["mode"], "dry-run")
        self.assertEqual(dry_run["tracking_seeded_from_ratings"], 1)
        self.assertEqual(dry_run["tracking_seeded_from_personal_lists"], 1)
        self.assertEqual(dry_run["shared_completed_rows_omitted"], 1)
        self.assertEqual(UserContentTracking.objects.count(), 0)

        first_output = StringIO()
        call_command(
            "backfill_public_profiles_tracking",
            "--apply",
            stdout=first_output,
        )
        self.assertEqual(UserContentTracking.objects.count(), 2)

        second_output = StringIO()
        call_command(
            "backfill_public_profiles_tracking",
            "--apply",
            stdout=second_output,
        )
        second = json.loads(second_output.getvalue())
        self.assertEqual(second["tracking_seeded_from_ratings"], 0)
        self.assertEqual(second["tracking_seeded_from_personal_lists"], 0)
        self.assertEqual(UserContentTracking.objects.count(), 2)

    def test_backfill_rehomes_season_rating_to_canonical_tv_show(self):
        tv_show = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="1396",
            content_type=ContentItem.ContentType.TV_SHOW,
        )
        season = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="1396:1",
            content_type=ContentItem.ContentType.SEASON,
        )
        SeasonDetail.objects.create(
            content_item=season,
            tv_show=tv_show,
            season_number=1,
        )
        legacy_rating = Rating.objects.create(
            user=self.user,
            content_item=season,
            score="8.5",
            comment="Legacy season review",
        )

        output = StringIO()
        call_command(
            "backfill_public_profiles_tracking",
            "--apply",
            stdout=output,
        )

        report = json.loads(output.getvalue())
        legacy_rating.refresh_from_db()
        season.refresh_from_db()
        self.assertEqual(report["season_ratings_rehomed"], 1)
        self.assertEqual(legacy_rating.content_item, tv_show)
        self.assertEqual(season.rating_count, 0)

        transition_tracking(
            user=self.user,
            content_item=season,
            status=UserContentTracking.Status.DROPPED,
        )
        legacy_rating.refresh_from_db()
        self.assertFalse(legacy_rating.is_active)

        updated = save_rating(
            user=self.user,
            content_item=season,
            score="9.0",
            comment="Updated",
        )
        self.assertEqual(updated.id, legacy_rating.id)
        self.assertEqual(
            Rating.objects.filter(user=self.user, content_item=tv_show).count(),
            1,
        )
        self.assertFalse(
            Rating.objects.filter(user=self.user, content_item=season).exists()
        )


class TrackingApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="api-tracker",
            password="secret",
        )
        self.movie = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="101",
            content_type=ContentItem.ContentType.MOVIE,
        )

    def test_tracking_endpoints_require_authentication(self):
        response = self.client.put(
            reverse(
                "content:content-tracking",
                kwargs={"content_id": self.movie.id},
            ),
            {"status": UserContentTracking.Status.BACKLOG},
            format="json",
        )
        self.assertEqual(response.status_code, 401)

    def test_tracking_status_favorite_and_delete_contract(self):
        self.client.force_authenticate(self.user)
        detail_url = reverse(
            "content:content-tracking",
            kwargs={"content_id": self.movie.id},
        )
        favorite_url = reverse(
            "content:content-tracking-favorite",
            kwargs={"content_id": self.movie.id},
        )

        backlog = self.client.put(
            detail_url,
            {"status": UserContentTracking.Status.BACKLOG},
            format="json",
        )
        self.assertEqual(backlog.status_code, 200)
        self.assertFalse(backlog.data["should_prompt_rating"])

        rejected_favorite = self.client.patch(
            favorite_url,
            {"is_favorite": True},
            format="json",
        )
        self.assertEqual(rejected_favorite.status_code, 409)
        self.assertEqual(
            rejected_favorite.data["error"],
            "TRACKING_NOT_COMPLETED",
        )

        completed = self.client.put(
            detail_url,
            {"status": UserContentTracking.Status.COMPLETED},
            format="json",
        )
        self.assertTrue(completed.data["should_prompt_rating"])
        favorite = self.client.patch(
            favorite_url,
            {"is_favorite": True},
            format="json",
        )
        self.assertEqual(favorite.status_code, 200)
        self.assertTrue(favorite.data["is_favorite"])

        deleted = self.client.delete(detail_url)
        self.assertEqual(deleted.status_code, 204)
        self.assertFalse(
            UserContentTracking.objects.filter(
                user=self.user,
                content_item=self.movie,
            ).exists()
        )

    def test_inactive_rating_detail_is_private_to_its_owner(self):
        other_user = User.objects.create_user(
            username="rating-reader",
            password="secret",
        )
        rating = Rating.objects.create(
            user=self.user,
            content_item=self.movie,
            score="7.5",
            comment="Preserved private review",
            is_active=False,
        )
        url = reverse(
            "content:ratings:rating-detail",
            kwargs={"pk": rating.id},
        )

        self.client.force_authenticate(other_user)
        self.assertEqual(self.client.get(url).status_code, 404)

        self.client.force_authenticate(self.user)
        owner_response = self.client.get(url)
        self.assertEqual(owner_response.status_code, 200)
        self.assertEqual(owner_response.data["id"], rating.id)
