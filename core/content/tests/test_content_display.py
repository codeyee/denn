from django.test import SimpleTestCase

from content.services.content_display import format_season_title


class SeasonTitleTests(SimpleTestCase):
    def test_uses_colon_separator_and_generic_season_label(self):
        self.assertEqual(
            format_season_title(
                tv_show_name="Demon Slayer",
                season_number=1,
                season_title="Demon Slayer",
            ),
            "Demon Slayer: Season 1",
        )

    def test_uses_a_specific_season_name_without_the_numbered_prefix(self):
        self.assertEqual(
            format_season_title(
                tv_show_name="Demon Slayer",
                season_number=1,
                season_title="Unwavering Resolve Arc",
            ),
            "Demon Slayer: Unwavering Resolve Arc",
        )

    def test_keeps_an_explicit_generic_season_name(self):
        self.assertEqual(
            format_season_title(
                tv_show_name="Demon Slayer",
                season_number=2,
                season_title="Season 2",
            ),
            "Demon Slayer: Season 2",
        )

    def test_normalizes_an_already_contextual_title(self):
        self.assertEqual(
            format_season_title(
                tv_show_name="Demon Slayer",
                season_number=2,
                season_title=(
                    "Demon Slayer — Season 2: Entertainment District Arc"
                ),
            ),
            "Demon Slayer: Entertainment District Arc",
        )
