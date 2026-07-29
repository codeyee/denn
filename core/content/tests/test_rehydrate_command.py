"""Sprint 07 / PR-7D: rehydrate_content_details management command."""
from __future__ import annotations

import json
from datetime import timedelta
from io import StringIO
from unittest.mock import patch

from django.core.management import CommandError, call_command
from django.test import TestCase
from django.utils import timezone

from content.models import ContentItem, GameDetail, GameDurationEstimate
from content.models.detail import MovieDetail
from content.services.local_content_store import (
    ensure_content_detail,
    get_or_create_content_item,
)
from content.services.local_content_store.mappers.game import upsert as upsert_game
from content.tests.fixtures.payloads import GAME_RDR2, MOVIE_MEMENTO


def _seed_movie(external_id: str = '77') -> ContentItem:
    payload = dict(MOVIE_MEMENTO)
    payload['id'] = external_id
    item, _ = get_or_create_content_item(
        ContentItem.SourceAPI.TMDB, external_id, ContentItem.ContentType.MOVIE,
    )
    ensure_content_detail(item, payload=payload, request_country='US')
    return item


def _age_movie(item: ContentItem, *, days: int) -> None:
    # ``MovieDetail.last_refreshed_at`` uses ``auto_now=True``; only ``.update()``
    # bypasses that behavior, so we go through the queryset.
    MovieDetail.objects.filter(content_item=item).update(
        last_refreshed_at=timezone.now() - timedelta(days=days)
    )


def _seed_game_without_duration(external_id: str = '25076') -> ContentItem:
    item, _ = get_or_create_content_item(
        ContentItem.SourceAPI.IGDB, external_id, ContentItem.ContentType.GAME,
    )
    GameDetail.objects.create(content_item=item, title='Red Dead Redemption 2')
    return item


class RehydrateCommandTests(TestCase):
    def test_invalid_content_type_errors(self):
        with self.assertRaises(CommandError):
            call_command('rehydrate_content_details', '--content-type', 'PODCAST')

    def test_dry_run_does_not_call_proxy_or_write(self):
        item = _seed_movie('77')
        _age_movie(item, days=365)
        item.movie_detail.refresh_from_db()
        last_before = item.movie_detail.last_refreshed_at

        with patch('content.utils.fetch_source_data') as fetch_mock:
            buf = StringIO()
            call_command(
                'rehydrate_content_details',
                '--content-type', 'MOVIE',
                '--dry-run',
                stdout=buf,
            )
            fetch_mock.assert_not_called()

        item.movie_detail.refresh_from_db()
        self.assertEqual(item.movie_detail.last_refreshed_at, last_before)
        self.assertIn('would refresh', buf.getvalue())
        self.assertIn('"event":"rehydrate"', buf.getvalue())

    def test_real_run_refreshes_stale_items(self):
        item = _seed_movie('77')
        _age_movie(item, days=365)

        refreshed_payload = dict(MOVIE_MEMENTO)
        refreshed_payload['id'] = '77'
        refreshed_payload['title'] = 'Memento (refreshed)'

        with patch(
            'content.utils.fetch_source_data',
            return_value=refreshed_payload,
        ):
            buf = StringIO()
            call_command(
                'rehydrate_content_details',
                '--content-type', 'MOVIE',
                '--workers', '1',
                stdout=buf,
            )

        item.movie_detail.refresh_from_db()
        self.assertEqual(item.movie_detail.title, 'Memento (refreshed)')
        # Structured log line is present.
        log_line = next(
            line for line in buf.getvalue().splitlines() if line.startswith('{')
        )
        evt = json.loads(log_line)
        self.assertEqual(evt['event'], 'rehydrate')
        self.assertEqual(evt['content_type'], ContentItem.ContentType.MOVIE)
        self.assertEqual(evt['total'], 1)
        self.assertEqual(evt['refreshed'], 1)
        self.assertEqual(evt['errors'], 0)
        self.assertIn('by_band', evt)

    def test_fresh_items_are_skipped(self):
        item = _seed_movie('77')
        # Detail is fresh by construction, so the selector should return [].

        buf = StringIO()
        with patch('content.utils.fetch_source_data') as fetch_mock:
            call_command(
                'rehydrate_content_details',
                '--content-type', 'MOVIE',
                stdout=buf,
            )
            fetch_mock.assert_not_called()

        log_line = next(
            line for line in buf.getvalue().splitlines() if line.startswith('{')
        )
        evt = json.loads(log_line)
        self.assertEqual(evt['total'], 0)
        self.assertEqual(evt['refreshed'], 0)

    def test_fresh_game_without_duration_is_selected_for_backfill(self):
        item = _seed_game_without_duration()

        with patch(
            'content.utils.fetch_source_data',
            return_value=GAME_RDR2,
        ):
            buf = StringIO()
            call_command(
                'rehydrate_content_details',
                '--content-type', 'GAME',
                '--workers', '1',
                stdout=buf,
            )

        duration = GameDurationEstimate.objects.get(content_item=item)
        self.assertEqual(duration.status, GameDurationEstimate.Status.MATCHED)
        log_line = next(
            line for line in buf.getvalue().splitlines() if line.startswith('{')
        )
        self.assertEqual(json.loads(log_line)['total'], 1)

    def test_game_with_no_duration_data_is_not_selected(self):
        item = _seed_game_without_duration()
        no_duration_payload = {
            **GAME_RDR2,
            'duration': {'source': 'igdb', 'status': 'no_data'},
        }
        upsert_game(item, no_duration_payload)

        buf = StringIO()
        with patch('content.utils.fetch_source_data') as fetch_mock:
            call_command(
                'rehydrate_content_details',
                '--content-type', 'GAME',
                stdout=buf,
            )
            fetch_mock.assert_not_called()

        log_line = next(
            line for line in buf.getvalue().splitlines() if line.startswith('{')
        )
        self.assertEqual(json.loads(log_line)['total'], 0)

    def test_ttl_override_includes_younger_items(self):
        item = _seed_movie('77')
        # 2 days old — fresh under 30d MOVIE TTL, stale under 1d override.
        _age_movie(item, days=2)

        with patch(
            'content.utils.fetch_source_data',
            return_value={**MOVIE_MEMENTO, 'id': '77'},
        ):
            buf = StringIO()
            call_command(
                'rehydrate_content_details',
                '--content-type', 'MOVIE',
                '--ttl-override', '1',
                '--workers', '1',
                stdout=buf,
            )

        log_line = next(
            line for line in buf.getvalue().splitlines() if line.startswith('{')
        )
        evt = json.loads(log_line)
        self.assertEqual(evt['total'], 1)
        self.assertIn('by_band', evt)

    def test_all_runs_every_type(self):
        # Just verify it iterates: no items in any table → six structured lines.
        buf = StringIO()
        call_command('rehydrate_content_details', '--content-type', 'ALL', stdout=buf)
        events = [
            json.loads(line) for line in buf.getvalue().splitlines() if line.startswith('{')
        ]
        types = {e['content_type'] for e in events}
        self.assertEqual(
            types,
            {
                ContentItem.ContentType.MOVIE,
                ContentItem.ContentType.TV_SHOW,
                ContentItem.ContentType.SEASON,
                ContentItem.ContentType.ALBUM,
                ContentItem.ContentType.GAME,
                ContentItem.ContentType.BOOK,
            },
        )
