"""Sprint 07 / PR-7E: backfill_content_details management command."""
from __future__ import annotations

import json
from io import StringIO
from unittest.mock import patch

from django.core.management import CommandError, call_command
from django.test import TestCase

from content.models import ContentItem
from content.tests.fixtures.payloads import MOVIE_MEMENTO


class BackfillCommandTests(TestCase):
    def test_invalid_content_type_errors(self):
        with self.assertRaises(CommandError):
            call_command('backfill_content_details', '--content-type', 'PODCAST')

    def test_no_items_no_writes(self):
        buf = StringIO()
        call_command('backfill_content_details', '--content-type', 'MOVIE', stdout=buf)
        line = next(l for l in buf.getvalue().splitlines() if l.startswith('{'))
        evt = json.loads(line)
        self.assertEqual(evt['event'], 'backfill')
        self.assertEqual(evt['total'], 0)

    def test_dry_run_lists_items_without_writing(self):
        ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='77',
            content_type=ContentItem.ContentType.MOVIE,
        )
        buf = StringIO()
        with patch('content.utils.fetch_source_data') as fetch_mock:
            call_command(
                'backfill_content_details',
                '--content-type', 'MOVIE',
                '--dry-run',
                stdout=buf,
            )
            fetch_mock.assert_not_called()
        self.assertIn('would backfill', buf.getvalue())

    def test_real_run_creates_detail(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='77',
            content_type=ContentItem.ContentType.MOVIE,
        )
        payload = dict(MOVIE_MEMENTO)
        payload['id'] = '77'

        buf = StringIO()
        with patch('content.utils.fetch_source_data', return_value=payload):
            call_command(
                'backfill_content_details',
                '--content-type', 'MOVIE',
                '--workers', '1',
                stdout=buf,
            )

        item.refresh_from_db()
        self.assertTrue(hasattr(item, 'movie_detail'))
        self.assertEqual(item.movie_detail.title, 'Memento')

        line = next(l for l in buf.getvalue().splitlines() if l.startswith('{'))
        evt = json.loads(line)
        self.assertEqual(evt['backfilled'], 1)
        self.assertEqual(evt['errors'], 0)

    def test_items_with_detail_are_skipped(self):
        item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id='77',
            content_type=ContentItem.ContentType.MOVIE,
        )
        from content.services.local_content_store import ensure_content_detail
        payload = dict(MOVIE_MEMENTO)
        payload['id'] = '77'
        ensure_content_detail(item, payload=payload, request_country='US')

        buf = StringIO()
        with patch('content.utils.fetch_source_data') as fetch_mock:
            call_command(
                'backfill_content_details',
                '--content-type', 'MOVIE',
                stdout=buf,
            )
            fetch_mock.assert_not_called()

        line = next(l for l in buf.getvalue().splitlines() if l.startswith('{'))
        evt = json.loads(line)
        self.assertEqual(evt['total'], 0)
