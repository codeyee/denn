from __future__ import annotations

import json
from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from content.models import ContentItem
from content.services.local_content_store import ensure_content_detail, get_or_create_content_item
from content.tests.fixtures.payloads import MOVIE_MEMENTO


class NormalizeRehydrationTimestampsCommandTests(TestCase):
    def test_dry_run_reports_bands(self):
        item, _ = get_or_create_content_item(
            ContentItem.SourceAPI.TMDB,
            "77",
            ContentItem.ContentType.MOVIE,
        )
        ensure_content_detail(item, payload=MOVIE_MEMENTO, request_country="US")

        buf = StringIO()
        call_command("normalize_rehydration_timestamps", stdout=buf)

        event = json.loads(buf.getvalue().strip())
        self.assertEqual(event["event"], "normalize_rehydration_timestamps")
        self.assertIn("by_band", event)
