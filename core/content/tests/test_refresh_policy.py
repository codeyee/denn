from __future__ import annotations

from datetime import timedelta

from django.test import TestCase
from django.utils import timezone

from content.models import ContentItem
from content.models.detail import AlbumDetail, BookDetail, MovieDetail, TvShowDetail
from content.services.local_content_store.refresh_policy import compute_refresh_policy


class RefreshPolicyTests(TestCase):
    def test_hot_movies_refresh_every_two_days(self):
        item = ContentItem(content_type=ContentItem.ContentType.MOVIE)
        detail = MovieDetail(release_date=timezone.now().date() - timedelta(days=10))

        policy = compute_refresh_policy(item, detail)

        self.assertEqual(policy.age_band, "hot")
        self.assertEqual(policy.ttl, timedelta(days=2))

    def test_classic_albums_extend_to_one_year(self):
        item = ContentItem(content_type=ContentItem.ContentType.ALBUM)
        detail = AlbumDetail(release_date=timezone.now().date() - timedelta(days=5000))

        policy = compute_refresh_policy(item, detail)

        self.assertEqual(policy.age_band, "classic")
        self.assertEqual(policy.ttl, timedelta(days=365))

    def test_unknown_books_use_doubled_unknown_ttl(self):
        item = ContentItem(content_type=ContentItem.ContentType.BOOK)
        detail = BookDetail(release_date=None)

        policy = compute_refresh_policy(item, detail)

        self.assertEqual(policy.age_band, "unknown")
        self.assertEqual(policy.ttl, timedelta(days=60))

    def test_returning_series_forces_hot_band(self):
        item = ContentItem(content_type=ContentItem.ContentType.TV_SHOW)
        detail = TvShowDetail(
            release_date=timezone.now().date() - timedelta(days=4000),
            status="returning series",
        )

        policy = compute_refresh_policy(item, detail)

        self.assertEqual(policy.age_band, "hot")
        self.assertEqual(policy.ttl, timedelta(days=2))
