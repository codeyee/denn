"""Tests for the named text-only Jev state (JEV-002-Q3)."""
import json
import unittest

from content.moderation.state import ModerationStateError, build_moderation_state


class BuildModerationStateTests(unittest.TestCase):
    def test_movie_projects_common_original_title_and_tagline_only(self):
        state = build_moderation_state(
            provider="tmdb",
            content_type="MOVIE",
            reconstructed_payload={
                "title": "  Film  Name ", "description": "A  story.\nMore.",
                "original_title": " 原題 ", "tagline": " A  promise. ",
                "genres": ["not persisted for movies"], "tags": ["do not use"],
                "id": "movie-123", "image_url": "https://image.invalid/poster",
                "release_date": "2026-01-01", "duration_minutes": 100, "adult": True,
            },
        )
        self.assertEqual(state, {
            "provider": "tmdb", "content_type": "MOVIE", "title": "Film Name",
            "description": "A story. More.",
            "type_specific": {"movie": {"original_title": "原題", "tagline": "A promise."}},
        })
        for excluded in (
            "movie-123", "image.invalid", "release_date", "adult",
            "not persisted for movies", "do not use",
        ):
            self.assertNotIn(excluded, json.dumps(state, ensure_ascii=False))

    def test_tv_show_keeps_its_own_original_title_and_tagline(self):
        state = build_moderation_state(
            provider="tmdb", content_type="TV_SHOW",
            reconstructed_payload={
                "title": "Show", "description": "A family drama.",
                "original_title": "Serie Original", "tagline": "No secrets.",
                "seasons": [{"title": "not season state"}],
            },
        )
        self.assertEqual(
            state["type_specific"],
            {"tv_show": {"original_title": "Serie Original", "tagline": "No secrets."}},
        )
        self.assertNotIn("seasons", state)

    def test_game_keeps_erotic_theme_separate_from_genres_and_benign_controls(self):
        state = build_moderation_state(
            provider="igdb", content_type="GAME",
            reconstructed_payload={
                "title": "Quest", "description": "A fantasy adventure.",
                "genres": [" Action ", "Role-playing", "Action"],
                "themes": ["Erotic", "Historical", "Fantasy"],
                "game_modes": ["Single player", "Co-operative"],
                "game_type": "Main game", "series": "Quest collection",
                "tags": ["not persisted"],
                "age_rating": "18+", "adult": True, "external_id": "game-123",
                "image_url": "https://image.invalid/cover", "release_date": "2026-01-01",
                "duration": {"normally": 100}, "raw_payload": {"secret": "not text"},
            },
        )
        game = state["type_specific"]["game"]
        self.assertEqual(game, {
            "genres": ["Action", "Role-playing"],
            "themes": ["Erotic", "Fantasy", "Historical"],
            "game_modes": ["Co-operative", "Single player"],
            "game_type": "Main game", "series": "Quest collection",
        })
        self.assertNotEqual(game["genres"], game["themes"])
        for excluded in (
            "age_rating", "adult", "game-123", "image.invalid", "release_date",
            "not persisted", "secret",
        ):
            self.assertNotIn(excluded, json.dumps(state))

    def test_equivalent_game_text_normalizes_to_the_same_state(self):
        first = build_moderation_state(
            provider="igdb", content_type="GAME", reconstructed_payload={
                "title": "A  game", "themes": ["Erotic", "Fantasy"],
                "game_modes": ["Single player", "Co-operative"],
                "genres": ["Action", "Role-playing"],
            },
        )
        reordered = build_moderation_state(
            provider=" igdb ", content_type="game", reconstructed_payload={
                "title": " A game ", "themes": [" Fantasy ", "Erotic", "Fantasy"],
                "game_modes": ["Co-operative", "Single  player"],
                "genres": ["Role-playing", "Action", "Action"],
            },
        )
        self.assertEqual(first, reordered)

    def test_missing_fields_stay_empty_and_malformed_collections_fail_closed(self):
        self.assertEqual(
            build_moderation_state(provider="igdb", content_type="GAME"),
            {
                "provider": "igdb", "content_type": "GAME", "title": "",
                "description": "", "type_specific": {"game": {
                    "genres": [], "themes": [], "game_modes": [],
                    "game_type": "", "series": "",
                }},
            },
        )
        with self.assertRaises(ModerationStateError):
            build_moderation_state(
                provider="igdb", content_type="GAME",
                reconstructed_payload={"themes": "Erotic"},
            )
        with self.assertRaises(ModerationStateError):
            build_moderation_state(provider="igdb", content_type=None)


if __name__ == "__main__":
    unittest.main()
