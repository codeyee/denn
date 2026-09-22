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

RESTRICTED_SIGNALS = (
    "adult-only explicit sexual content",
    "nudity",
    "graphic gore",
    "extreme violence",
    "sexual exploitation",
    "hateful/extremist propaganda",
)
ORDINARY_SIGNALS = (
    "mature themes",
    "crime",
    "horror",
    "action",
    "non-graphic violence",
    "profanity",
    "romance",
    "alcohol/drug references",
)


class ModerationQuestionsContractTests(unittest.TestCase):
    def test_holds_exactly_the_issue_102_contract_keys(self):
        self.assertEqual(set(MODERATION_QUESTIONS), CONTRACT_KEYS)
        for question in MODERATION_QUESTIONS.values():
            self.assertIsInstance(question, Noul)

    def test_safe_question_keeps_ordinary_mature_content_discoverable(self):
        question = MODERATION_QUESTIONS["safe_for_automatic_discovery"]
        text = f"{question.instructions} {question.criteria}".lower()
        for signal in ORDINARY_SIGNALS:
            self.assertIn(signal, text)
        for signal in RESTRICTED_SIGNALS:
            self.assertIn(signal, text)
        self.assertIn("sparse metadata alone is not evidence", text)

    def test_explicit_question_requires_clear_restricted_evidence(self):
        question = MODERATION_QUESTIONS["explicit_or_sensitive"]
        text = f"{question.instructions} {question.criteria}".lower()
        for signal in RESTRICTED_SIGNALS:
            self.assertIn(signal, text)
        for signal in ORDINARY_SIGNALS:
            self.assertIn(signal, text)
        self.assertIn("provider or content type alone", text)

    def test_needs_review_requires_concrete_ambiguous_restricted_signal(self):
        question = MODERATION_QUESTIONS["needs_review"]
        text = f"{question.instructions} {question.criteria}".lower()
        self.assertIn("concrete but ambiguous", text)
        self.assertIn("contradictory", text)
        for excluded in (
            "sparse metadata alone",
            "unfamiliar title",
            "missing genres or tags",
            "ordinary mature themes",
        ):
            self.assertIn(excluded, text)

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
        self.assertEqual(settings.MODERATION_QUESTION_REVISION, "q2")


if __name__ == "__main__":
    unittest.main()
