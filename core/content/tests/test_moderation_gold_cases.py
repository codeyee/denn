"""Offline schema and privacy tests for Jev moderation gold cases."""
import json
import unittest
from copy import deepcopy
from pathlib import Path

from content.moderation.evaluation_cases import (
    GOLD_SCHEMA_VERSION,
    GoldCaseValidationError,
    load_gold_dataset,
    validate_gold_dataset,
)

FIXTURE = Path(__file__).parent / "fixtures" / "jev_moderation_gold_cases_v1.json"


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
        self.assertEqual(cases[1]["provider_explicit"], True)

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

    def test_validator_returns_independent_case_copies(self):
        document = fixture_document()
        cases = validate_gold_dataset(document)
        cases[0]["state"]["title"] = "Changed copy"

        self.assertNotEqual(document["cases"][0]["state"]["title"], "Changed copy")


if __name__ == "__main__":
    unittest.main()
