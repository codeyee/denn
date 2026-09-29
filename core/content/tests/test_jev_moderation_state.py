"""Tests for the named text-only Jev state (JEV-002-Q3)."""
import json
import unittest

from content.moderation.state import (
    ModerationStateError,
    build_moderation_state,
    hash_moderation_state,
)


class BuildModerationStateTests(unittest.TestCase):
    def test_movie_projects_text_and_safety_context_but_never_the_adult_flag(self):
        state = build_moderation_state(
            provider="tmdb",
            content_type="MOVIE",
            reconstructed_payload={
                "title": "  Film  Name ", "description": "A  story.\nMore.",
                "original_title": " 原題 ", "tagline": " A  promise. ",
                "genres": [" Drama ", "Romance", "Drama"], "tags": ["do not use"],
                "keywords": ["softcore", " erotic  movie ", "softcore"],
                "certifications": [
                    {"country": "us", "rating": " R "},
                    {"country": "GB", "rating": "18"},
                    {"country": "ZZ", "rating": "X"},
                    {"country": "DE", "rating": ""},
                ],
                "id": "movie-123", "image_url": "https://image.invalid/poster",
                "release_date": "2026-01-01", "duration_minutes": 100, "adult": True,
            },
        )
        self.assertEqual(state, {
            "provider": "tmdb", "content_type": "MOVIE", "title": "Film Name",
            "description": "A story. More.",
            "type_specific": {"movie": {
                "original_title": "原題", "tagline": "A promise.",
                "genres": ["Drama", "Romance"],
                "keywords": ["erotic movie", "softcore"],
                "certifications": ["GB: 18", "US: R"],
            }},
        })
        for excluded in (
            "movie-123", "image.invalid", "release_date", "adult", "do not use",
            "ZZ", "true",
        ):
            self.assertNotIn(excluded, json.dumps(state, ensure_ascii=False))

    def test_tv_show_keeps_its_own_text_and_safety_context(self):
        state = build_moderation_state(
            provider="tmdb", content_type="TV_SHOW",
            reconstructed_payload={
                "title": "Show", "description": "A family drama.",
                "original_title": "Serie Original", "tagline": "No secrets.",
                "genres": ["Drama"], "keywords": ["family"],
                "certifications": [{"country": "US", "rating": "TV-MA"}],
                "seasons": [{"title": "not season state"}], "adult": False,
            },
        )
        self.assertEqual(
            state["type_specific"],
            {"tv_show": {
                "original_title": "Serie Original", "tagline": "No secrets.",
                "genres": ["Drama"], "keywords": ["family"],
                "certifications": ["US: TV-MA"],
            }},
        )
        self.assertNotIn("seasons", state)
        self.assertNotIn("adult", json.dumps(state))

    def test_movie_and_tv_show_without_safety_fields_keep_empty_lists(self):
        for kind in ("movie", "tv_show"):
            with self.subTest(kind=kind):
                state = build_moderation_state(
                    provider="tmdb", content_type=kind.upper(), reconstructed_payload={
                        "title": "Untitled", "original_title": "Untitled",
                    },
                )
                self.assertEqual(state["type_specific"][kind], {
                    "original_title": "Untitled", "tagline": "",
                    "genres": [], "keywords": [], "certifications": [],
                })

    def test_certifications_keep_only_allowlisted_countries_and_are_order_stable(self):
        allowed = ("US", "GB", "CA", "AU", "IE", "DE", "FR", "ES", "MX", "BR", "JP", "KR")
        certifications = [{"country": code, "rating": "R"} for code in (*allowed, "IT", "RU", "IN")]
        forward = build_moderation_state(
            provider="tmdb", content_type="MOVIE",
            reconstructed_payload={"certifications": certifications},
        )
        reverse = build_moderation_state(
            provider="tmdb", content_type="MOVIE",
            reconstructed_payload={"certifications": list(reversed(certifications))},
        )

        self.assertEqual(forward, reverse)
        self.assertEqual(
            forward["type_specific"]["movie"]["certifications"],
            sorted(f"{code}: R" for code in allowed),
        )

    def test_keywords_and_subjects_are_capped_deterministically_in_provider_order(self):
        keywords = [f"keyword {number:03}" for number in range(60)]
        subjects = [f"subject {number:03}" for number in range(45)]

        movie = build_moderation_state(
            provider="tmdb", content_type="MOVIE", reconstructed_payload={"keywords": keywords},
        )
        game = build_moderation_state(
            provider="igdb", content_type="GAME", reconstructed_payload={"keywords": keywords},
        )
        book = build_moderation_state(
            provider="openlibrary", content_type="BOOK", reconstructed_payload={"subjects": subjects},
        )

        self.assertEqual(movie["type_specific"]["movie"]["keywords"], keywords[:40])
        self.assertEqual(game["type_specific"]["game"]["keywords"], keywords[:40])
        self.assertEqual(book["type_specific"]["book"]["subjects"], subjects[:30])
        self.assertEqual(hash_moderation_state(movie), hash_moderation_state(build_moderation_state(
            provider="tmdb", content_type="MOVIE",
            reconstructed_payload={"keywords": list(reversed(keywords[:40])) + keywords[40:]},
        )))

    def test_malformed_safety_collections_fail_closed(self):
        for content_type, key, bad in (
            ("MOVIE", "keywords", "softcore"),
            ("MOVIE", "keywords", [1]),
            ("TV_SHOW", "certifications", "US: R"),
            ("TV_SHOW", "certifications", ["US: R"]),
            ("MOVIE", "genres", {"name": "Drama"}),
            ("GAME", "age_ratings", ["ESRB M"]),
            ("GAME", "age_ratings", [{"organization": "ESRB", "rating": "M", "descriptors": "Blood"}]),
            ("BOOK", "subjects", "Fiction"),
        ):
            with self.subTest(content_type=content_type, key=key, bad=bad):
                with self.assertRaises(ModerationStateError):
                    build_moderation_state(
                        provider="source", content_type=content_type,
                        reconstructed_payload={key: bad},
                    )

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
                "keywords": ["dating sim", " sex ", "dating sim"],
                "age_ratings": [
                    {"organization": "ESRB", "rating": "M",
                     "descriptors": ["Nudity", "Blood and Gore", "Nudity"]},
                    {"organization": "PEGI", "rating": "18"},
                    {"organization": "", "rating": "X"},
                ],
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
            "keywords": ["dating sim", "sex"],
            "age_ratings": ["ESRB M: Blood and Gore; Nudity", "PEGI 18"],
        })
        self.assertNotEqual(game["genres"], game["themes"])
        for excluded in (
            "age_rating\"", "adult", "game-123", "image.invalid", "release_date",
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

    def test_season_keeps_parent_show_and_every_episode_text(self):
        episodes = [
            {
                "id": f"episode-{index}", "episode_number": index,
                "title": f" Episode {index:03} ", "description": f" Summary {index:03} ",
                "release_date": "2026-01-01", "duration_minutes": 45,
                "image_url": "https://image.invalid/episode",
            }
            for index in range(135)
        ]
        payload = {
            "title": "Season 1", "description": "A season summary.",
            "tv_show_name": " Parent Show ", "episodes": episodes,
            "season_number": 1, "id": "season-1",
        }
        state = build_moderation_state(
            provider="tmdb", content_type="SEASON", reconstructed_payload=payload
        )
        reordered = build_moderation_state(
            provider="tmdb", content_type="SEASON",
            reconstructed_payload={**payload, "episodes": list(reversed(episodes))},
        )

        season = state["type_specific"]["season"]
        self.assertEqual(season["parent_show_name"], "Parent Show")
        self.assertEqual(len(season["episodes"]), 135)
        self.assertIn(
            {"title": "Episode 134", "description": "Summary 134"},
            season["episodes"],
        )
        self.assertEqual(state, reordered)
        for excluded in (
            "episode-134", "episode_number", "release_date", "duration_minutes",
            "image.invalid", "season_number", "season-1",
        ):
            self.assertNotIn(excluded, json.dumps(state))

    def test_album_keeps_artists_and_every_track_name_and_credit(self):
        tracks = [
            {
                "id": f"track-{index}", "track_number": index,
                "title": f" Track {index:03} ", "duration_seconds": 200,
                "external_url": "https://track.invalid/item",
                "authors": [{"name": f"Artist {index:03}", "type": "Performer"}],
                "explicit": index == 121,
            }
            for index in range(122)
        ]
        payload = {
            "title": "Record", "authors": [{"name": " Main Artist ", "type": "artist"}],
            "tracks": tracks, "album_type": "album", "external_url": "https://album.invalid",
        }
        state = build_moderation_state(
            provider="spotify", content_type="ALBUM", reconstructed_payload=payload
        )
        reordered = build_moderation_state(
            provider="spotify", content_type="ALBUM",
            reconstructed_payload={**payload, "tracks": list(reversed(tracks))},
        )

        album = state["type_specific"]["album"]
        self.assertEqual(album["artists"], ["Main Artist"])
        self.assertEqual(len(album["tracks"]), 122)
        self.assertIn(
            {
                "title": "Track 121",
                "credits": [{"name": "Artist 121", "role": "Performer"}],
                "parental_advisory": "explicit",
            },
            album["tracks"],
        )
        self.assertIn(
            {
                "title": "Track 120",
                "credits": [{"name": "Artist 120", "role": "Performer"}],
                "parental_advisory": "",
            },
            album["tracks"],
        )
        self.assertEqual(state, reordered)
        for excluded in (
            "track-121", "track_number", "duration_seconds", "track.invalid",
            "album_type", "album.invalid",
        ):
            self.assertNotIn(excluded, json.dumps(state))

    def test_book_projects_normalized_author_names_and_subjects(self):
        state = build_moderation_state(
            provider="openlibrary", content_type="BOOK", reconstructed_payload={
                "title": "Book", "description": "A mystery.",
                "authors": [
                    {"name": " A. Author ", "type": "author", "id": "person-1"},
                    {"name": "B. Author", "type": "author", "url": "https://author.invalid"},
                ],
                "subjects": ["Fiction", " Erotica ", "Fiction"],
                "id": "book-123", "cover_url": "https://image.invalid/book",
                "first_publish_year": 2020, "pages": 300,
            },
        )
        self.assertEqual(
            state["type_specific"],
            {"book": {
                "authors": ["A. Author", "B. Author"],
                "subjects": ["Erotica", "Fiction"],
            }},
        )
        for excluded in ("person-1", "author.invalid", "book-123", "image.invalid", "2020", "300"):
            self.assertNotIn(excluded, json.dumps(state))

    def test_missing_season_album_and_book_text_stays_empty(self):
        for content_type, expected in (
            ("SEASON", {"parent_show_name": "", "episodes": []}),
            ("ALBUM", {"artists": [], "tracks": []}),
            ("BOOK", {"authors": [], "subjects": []}),
        ):
            with self.subTest(content_type=content_type):
                state = build_moderation_state(
                    provider="source", content_type=content_type
                )
                self.assertEqual(state["type_specific"][content_type.casefold()], expected)

    def test_only_a_true_explicit_flag_sets_the_track_advisory(self):
        for flag, expected in ((True, "explicit"), (False, ""), (None, ""), ("true", ""), (1, "")):
            with self.subTest(flag=flag):
                state = build_moderation_state(
                    provider="spotify", content_type="ALBUM", reconstructed_payload={
                        "tracks": [{"title": "Song", "explicit": flag}],
                    },
                )
                self.assertEqual(
                    state["type_specific"]["album"]["tracks"],
                    [{"title": "Song", "credits": [], "parental_advisory": expected}],
                )

    def test_safety_context_changes_the_hash_and_equal_context_does_not(self):
        base = {"title": "Quest", "description": "A story."}
        plain = build_moderation_state(
            provider="igdb", content_type="GAME", reconstructed_payload=base)
        rated = build_moderation_state(
            provider="igdb", content_type="GAME", reconstructed_payload={
                **base, "age_ratings": [{"organization": "ESRB", "rating": "M"}]})
        reordered = build_moderation_state(
            provider="igdb", content_type="GAME", reconstructed_payload={
                **base, "age_ratings": [{"organization": "ESRB", "rating": "M", "descriptors": []}]})

        self.assertNotEqual(hash_moderation_state(plain), hash_moderation_state(rated))
        self.assertEqual(hash_moderation_state(rated), hash_moderation_state(reordered))

    def test_missing_fields_stay_empty_and_malformed_collections_fail_closed(self):
        self.assertEqual(
            build_moderation_state(provider="igdb", content_type="GAME"),
            {
                "provider": "igdb", "content_type": "GAME", "title": "",
                "description": "", "type_specific": {"game": {
                    "genres": [], "themes": [], "game_modes": [],
                    "game_type": "", "series": "", "keywords": [], "age_ratings": [],
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
