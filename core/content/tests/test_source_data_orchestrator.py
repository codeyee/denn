"""Orchestrator scenarios: all-fresh, all-stale, mixed, proxy-down (Sprint 07 / PR-7B)."""
from __future__ import annotations

from datetime import timedelta
from unittest.mock import patch

from django.test import TestCase, override_settings
from django.utils import timezone

from content.models import ContentItem, MovieDetail
from content.services.local_content_store import (
    ensure_content_detail,
    get_or_create_content_item,
)
from content.services.source_data_orchestrator import fetch_bulk_source_data
from content.tests.fixtures.payloads import MOVIE_MEMENTO


def _ingest_movie(external_id: str = '77'):
    item, _ = get_or_create_content_item(
        ContentItem.SourceAPI.TMDB, external_id, ContentItem.ContentType.MOVIE,
    )
    payload = dict(MOVIE_MEMENTO)
    payload['id'] = external_id
    ensure_content_detail(item, payload=payload, request_country='US')
    return item


def _make_stale(item: ContentItem):
    """Move the Detail's `last_refreshed_at` past the TTL so it's stale."""
    MovieDetail.objects.filter(content_item=item).update(
        last_refreshed_at=timezone.now() - timedelta(days=365),
    )


class OrchestratorAllFreshTests(TestCase):
    def test_no_proxy_call_when_everything_is_fresh(self):
        items = [_ingest_movie('77'), _ingest_movie('88')]
        with patch('content.services.source_data_orchestrator._proxy_fetch') as mocked:
            results = fetch_bulk_source_data(items)
            mocked.assert_not_called()
        self.assertEqual(set(results.keys()), {items[0].id, items[1].id})


class OrchestratorAllStaleTests(TestCase):
    def test_stale_triggers_proxy_and_persists(self):
        items = [_ingest_movie('77')]
        _make_stale(items[0])

        new_payload = dict(MOVIE_MEMENTO)
        new_payload['title'] = 'Memento (refreshed)'

        with patch('content.services.source_data_orchestrator._proxy_fetch') as mocked:
            mocked.return_value = {items[0].id: new_payload}
            results = fetch_bulk_source_data(items)

        self.assertEqual(results[items[0].id]['title'], 'Memento (refreshed)')
        items[0].refresh_from_db()
        self.assertEqual(items[0].movie_detail.title, 'Memento (refreshed)')


class OrchestratorMissingTests(TestCase):
    def test_missing_triggers_proxy_and_creates_detail(self):
        item, _ = get_or_create_content_item(
            ContentItem.SourceAPI.TMDB, '77', ContentItem.ContentType.MOVIE,
        )
        with patch('content.services.source_data_orchestrator._proxy_fetch') as mocked:
            mocked.return_value = {item.id: MOVIE_MEMENTO}
            results = fetch_bulk_source_data([item])

        self.assertIn(item.id, results)
        self.assertTrue(MovieDetail.objects.filter(content_item=item).exists())


class OrchestratorProxyDownTests(TestCase):
    def test_stale_falls_back_to_local_with_is_stale(self):
        item = _ingest_movie('77')
        _make_stale(item)

        with patch('content.services.source_data_orchestrator._proxy_fetch') as mocked:
            mocked.return_value = {}
            results = fetch_bulk_source_data([item])

        self.assertIn(item.id, results)
        self.assertTrue(results[item.id].get('is_stale'))

    def test_missing_with_proxy_down_returns_nothing_for_item(self):
        item, _ = get_or_create_content_item(
            ContentItem.SourceAPI.TMDB, '77', ContentItem.ContentType.MOVIE,
        )
        with patch('content.services.source_data_orchestrator._proxy_fetch') as mocked:
            mocked.return_value = {}
            results = fetch_bulk_source_data([item])
        self.assertNotIn(item.id, results)


@override_settings(FORCE_PROXY_FETCH=True)
class OrchestratorForceProxyTests(TestCase):
    def test_force_proxy_skips_fresh_local(self):
        item = _ingest_movie('77')

        with patch('content.services.source_data_orchestrator._proxy_fetch') as mocked:
            mocked.return_value = {item.id: MOVIE_MEMENTO}
            fetch_bulk_source_data([item])
            mocked.assert_called_once()
