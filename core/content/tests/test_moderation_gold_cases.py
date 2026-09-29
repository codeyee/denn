"""Offline schema and privacy tests for Jev moderation gold cases."""
import json
import unittest
from copy import deepcopy
from pathlib import Path

from content.moderation.evaluation_cases import (
    GOLD_SCHEMA_VERSION,
    TYPE_SPECIFIC_SHAPES,
    GoldCaseValidationError,
    load_gold_dataset,
    validate_gold_dataset,
)

FIXTURE = Path(__file__).parent / "fixtures" / "jev_moderation_gold_cases_v2.json"


def fixture_document():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


class ModerationGoldCaseTests(unittest.TestCase):
    def test_committed_fixture_is_valid_and_keeps_manual_metadata_out_of_state(self):
        document = fixture_document()
        cases = load_gold_dataset(FIXTURE)

        self.assertEqual(document["schema_version"], GOLD_SCHEMA_VERSION)
        self.assertEqual(len(cases), 3)
        self.assertTrue(all(case["adjudication"]["status"] == "synthetic" for case in cases))
        self.assertTrue(all("language" not in case["state"] for case in cases))
        self.assertEqual(cases[0]["provider_explicit"], True)
        self.assertEqual(cases[1]["provider_explicit"], False)

    def test_case_shape_and_identifiers_are_strict(self):
        mutations = []
        raw = fixture_document()
        raw["unexpected"] = "not in the versioned schema"
        mutations.append(raw)
        raw = fixture_document()
        raw["cases"][0]["state"]["external_id"] = "12345"
        mutations.append(raw)
        raw = fixture_document()
        raw["cases"][1]["case_id"] = raw["cases"][0]["case_id"]
        mutations.append(raw)
        raw = fixture_document()
        raw["cases"][0]["state"]["type_specific"] = {"album": {"artists": []}}
        mutations.append(raw)
        raw = fixture_document()
        raw["cases"][0]["state"]["language"] = "en"
        mutations.append(raw)
        raw = fixture_document()
        raw["cases"][0]["content_type"] = ["movie"]
        mutations.append(raw)

        for invalid in mutations:
            with self.subTest(invalid=invalid):
                with self.assertRaises(GoldCaseValidationError):
                    validate_gold_dataset(invalid)

    def test_privacy_and_human_adjudication_rules_are_enforced(self):
        mutations = []
        raw = fixture_document()
        raw["cases"][0]["state"]["title"] = "https://example.invalid/title"
        mutations.append(raw)
        raw = fixture_document()
        raw["cases"][0]["state"]["description"] = "api_key=do-not-commit"
        mutations.append(raw)
        raw = fixture_document()
        raw["cases"][0]["state"]["type_specific"]["movie"]["tagline"] = (
            "eyJabcdefgh.ijklmnop.qrstuvwx"
        )
        mutations.append(raw)
        raw = fixture_document()
        case = raw["cases"][0]
        case["source_kind"] = "catalog_text"
        case["adjudication"] = {
            "status": "human_adjudicated", "reviewer_count": 0,
            "guideline_revision": "guideline-v1",
        }
        mutations.append(raw)
        raw = fixture_document()
        raw["cases"][0]["provider_explicit"] = 1
        mutations.append(raw)

        for invalid in mutations:
            with self.subTest(invalid=invalid):
                with self.assertRaises(GoldCaseValidationError):
                    validate_gold_dataset(invalid)

    def test_provider_explicit_is_limited_to_the_authoritative_provider_rules(self):
        spotify_override = fixture_document()
        spotify_override["cases"][1]["provider_explicit"] = True
        tmdb_album_override = fixture_document()
        tmdb_album_override["cases"][0]["content_type"] = "album"
        tmdb_album_override["cases"][0]["state"] = {
            "provider": "tmdb", "content_type": "ALBUM", "title": "Test",
            "description": "Test", "type_specific": {"album": {"artists": [], "tracks": []}},
        }
        igdb_book_override = fixture_document()
        igdb_book_override["cases"][2]["provider"] = "igdb"
        igdb_book_override["cases"][2]["state"]["provider"] = "igdb"
        igdb_book_override["cases"][2]["provider_explicit"] = True

        for invalid in (spotify_override, tmdb_album_override, igdb_book_override):
            with self.subTest(case=invalid["cases"]):
                with self.assertRaisesRegex(GoldCaseValidationError, "provider_explicit"):
                    validate_gold_dataset(invalid)

    def test_provider_explicit_true_is_allowed_for_tmdb_titles_and_igdb_games(self):
        tv_override = fixture_document()
        tv_override["cases"][0]["content_type"] = "tv_show"
        tv_override["cases"][0]["state"]["content_type"] = "TV_SHOW"
        tv_override["cases"][0]["state"]["type_specific"] = {
            "tv_show": tv_override["cases"][0]["state"]["type_specific"]["movie"]}
        game_override = fixture_document()
        game_override["cases"][0].update(provider="igdb", content_type="game", provider_explicit=True)
        game_override["cases"][0]["state"].update(provider="igdb", content_type="GAME")
        game_override["cases"][0]["state"]["type_specific"] = {"game": {
            "genres": [], "themes": [], "game_modes": [], "game_type": "", "series": "",
            "keywords": ["sex"], "age_ratings": ["ESRB AO: Sexual Content"],
        }}

        for document in (tv_override, game_override):
            with self.subTest(content_type=document["cases"][0]["content_type"]):
                self.assertEqual(len(validate_gold_dataset(document)), 3)

    def test_schema_is_v2_and_rejects_v1_documents_and_pre_q4_state_shapes(self):
        self.assertEqual(GOLD_SCHEMA_VERSION, "jev-moderation-gold-cases/v2")
        v1 = fixture_document()
        v1["schema_version"] = "jev-moderation-gold-cases/v1"
        missing_keywords = fixture_document()
        del missing_keywords["cases"][0]["state"]["type_specific"]["movie"]["keywords"]
        missing_advisory = fixture_document()
        del missing_advisory["cases"][1]["state"]["type_specific"]["album"]["tracks"][0][
            "parental_advisory"]
        missing_subjects = fixture_document()
        del missing_subjects["cases"][2]["state"]["type_specific"]["book"]["subjects"]
        adult_flag = fixture_document()
        adult_flag["cases"][0]["state"]["type_specific"]["movie"]["adult"] = "true"
        url_keyword = fixture_document()
        url_keyword["cases"][0]["state"]["type_specific"]["movie"]["keywords"] = ["https://x.invalid"]

        for invalid in (v1, missing_keywords, missing_advisory, missing_subjects, adult_flag, url_keyword):
            with self.subTest(invalid=invalid["schema_version"]):
                with self.assertRaises(GoldCaseValidationError):
                    validate_gold_dataset(invalid)

    def test_q4_state_shapes_cover_every_content_type(self):
        self.assertEqual(
            {key: sorted(shape[key]) for key, shape in TYPE_SPECIFIC_SHAPES.items()},
            {
                "movie": ["certifications", "genres", "keywords", "original_title", "tagline"],
                "tv_show": ["certifications", "genres", "keywords", "original_title", "tagline"],
                "game": ["age_ratings", "game_modes", "game_type", "genres", "keywords",
                         "series", "themes"],
                "season": ["episodes", "parent_show_name"],
                "album": ["artists", "tracks"],
                "book": ["authors", "subjects"],
            },
        )

    def test_validator_returns_independent_case_copies(self):
        document = fixture_document()
        cases = validate_gold_dataset(document)
        cases[0]["state"]["title"] = "Changed copy"

        self.assertNotEqual(document["cases"][0]["state"]["title"], "Changed copy")


if __name__ == "__main__":
    unittest.main()
