"""Contract tests for the typed Jev moderation questions (JEV-002A)."""
import unittest

from typesafe_sdk import Noul

from content.moderation.questions import (
    MODERATION_QUESTIONS,
    moderation_question_revision,
)

CONTRACT_KEYS = {
    "safe_for_automatic_discovery",
    "explicit_or_sensitive",
    "needs_review",
}

NEEDS_REVIEW_SIGNALS = ("sparse", "ambiguous", "contradictory", "insufficient")


class ModerationQuestionsContractTests(unittest.TestCase):
    def test_holds_exactly_the_issue_102_contract_keys(self):
        self.assertEqual(set(MODERATION_QUESTIONS), CONTRACT_KEYS)
        for question in MODERATION_QUESTIONS.values():
            self.assertIsInstance(question, Noul)

    def test_needs_review_judges_insufficient_metadata_explicitly(self):
        instructions = MODERATION_QUESTIONS["needs_review"].instructions.lower()
        for signal in NEEDS_REVIEW_SIGNALS:
            self.assertIn(signal, instructions)

    def test_every_question_anchors_on_text_only_state(self):
        for name, question in MODERATION_QUESTIONS.items():
            instructions = question.instructions
            self.assertIsInstance(instructions, str)
            self.assertTrue(instructions.strip(), name)
            self.assertIn("state", instructions, name)
            lowered = instructions.lower()
            import re
            for forbidden in ("poster", "backdrop", "cover", "url", "rating", "release_date"):
                self.assertIsNone(
                    re.search(rf"\b{re.escape(forbidden)}\b", lowered),
                    f"{name} references {forbidden}",
                )

    def test_questions_come_with_explicit_yes_and_no_criteria(self):
        for name, question in MODERATION_QUESTIONS.items():
            criteria = question.criteria
            self.assertIsInstance(criteria, dict, name)
            self.assertTrue(criteria.get("true"), name)
            self.assertTrue(criteria.get("false"), name)

    def test_question_revision_comes_only_from_settings(self):
        from django.conf import settings
        from django.test import override_settings

        with override_settings(MODERATION_QUESTION_REVISION="q-test"):
            self.assertEqual(moderation_question_revision(), "q-test")
        self.assertTrue(settings.MODERATION_QUESTION_REVISION)


if __name__ == "__main__":
    unittest.main()
