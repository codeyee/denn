from django.test import SimpleTestCase

from content.services.game_duration import normalize_game_duration_values


class GameDurationNormalizationTests(SimpleTestCase):
    def test_drops_values_above_thousand_hours(self):
        normalized = normalize_game_duration_values({
            'hastily_seconds': 10 * 60 * 60,
            'normally_seconds': 3001 * 60 * 60,
            'completely_seconds': 20 * 60 * 60,
        })

        self.assertEqual(normalized, {
            'hastily_seconds': 10 * 60 * 60,
            'normally_seconds': None,
            'completely_seconds': 20 * 60 * 60,
        })

    def test_rejects_contradictory_order(self):
        normalized = normalize_game_duration_values({
            'hastily_seconds': 100 * 60 * 60,
            'normally_seconds': 50 * 60 * 60,
            'completely_seconds': 200 * 60 * 60,
        })

        self.assertEqual(normalized, {
            'hastily_seconds': None,
            'normally_seconds': None,
            'completely_seconds': None,
        })

    def test_allows_missing_metrics_when_remaining_values_are_ordered(self):
        normalized = normalize_game_duration_values({
            'hastily_seconds': 10 * 60 * 60,
            'completely_seconds': 20 * 60 * 60,
        })

        self.assertEqual(normalized, {
            'hastily_seconds': 10 * 60 * 60,
            'normally_seconds': None,
            'completely_seconds': 20 * 60 * 60,
        })
