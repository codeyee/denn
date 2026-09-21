"""Tests for the text-only moderation state builder (JEV-002A)."""
import unittest

from content.moderation.state import ModerationStateError, build_moderation_state


class BuildModerationStateTests(unittest.TestCase):
    def test_builds_named_fields_with_text_normalization(self):
        state = build_moderation_state(
            provider="igdb",
            content_type="GAME",
            title="  Cry  of	the  Wild\n",
            description="A  violent  game.\nPlot  twists.",
            genres=[" Action ", "Horror"],
            tags=["gore", " violence ", "gore"],
        )
        self.assertEqual(
            state,
            {
                "provider": "igdb",
                "content_type": "GAME",
                "title": "Cry of the Wild",
                "description": "A violent game. Plot twists.",
                "genres": ["Action", "Horror"],
                "tags": ["gore", "violence"],
            },
        )

    def test_missing_fields_fail_safe_to_empty_values(self):
        state = build_moderation_state(
            provider="spotify", content_type="ALBUM", description=None
        )
        self.assertEqual(
            state,
            {
                "provider": "spotify",
                "content_type": "ALBUM",
                "title": "",
                "description": "",
                "genres": [],
                "tags": [],
            },
        )

    def test_rejects_non_text_scalar_fields(self):
        with self.assertRaises(ModerationStateError):
            build_moderation_state(provider="igdb", content_type=None)

    def test_state_keys_are_exactly_the_allowed_text_only_surface(self):
        state = build_moderation_state(
            provider="openlibrary", content_type="BOOK", description="d"
        )
        self.assertEqual(
            set(state),
            {"provider", "content_type", "title", "description", "genres", "tags"},
        )
        self.assertNotIn("external_id", state)
        self.assertNotIn("url", state)


if __name__ == "__main__":
    unittest.main()
