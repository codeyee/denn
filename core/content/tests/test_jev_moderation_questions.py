"""Tests for the typed Jev moderation questions (JEV-002A)."""
import re
import unittest

from typesafe_sdk import Noul

from content.moderation.questions import (
    MODERATION_QUESTION_REVISION,
    MODERATION_QUESTIONS,
)

FORBIDDEN_STATE_REFERENCES = {"poster", "backdrop", "cover", "url", "rating", "release_date"}


class ModerationQuestionsTests(unittest.TestCase):
    def test_holds_exactly_three_named_noul_questions(self):
        self.assertEqual(
            set(MODERATION_QUESTIONS),
            {"adult_content", "graphic_violence", "offensive_content"},
        )
        for question in MODERATION_QUESTIONS.values():
            self.assertIsInstance(question, Noul)

    def test_every_question_anchors_on_text_only_state(self):
        for name, question in MODERATION_QUESTIONS.items():
            instructions = question.instructions
            self.assertIsInstance(instructions, str)
            self.assertTrue(instructions.strip(), name)
            self.assertIn("state", instructions, name)
            lowered = instructions.lower()
            for forbidden in FORBIDDEN_STATE_REFERENCES:
                self.assertNotIn(forbidden, lowered, f"{name} references {forbidden}")

    def test_questions_come_with_explicit_yes_and_no_criteria(self):
        for name, question in MODERATION_QUESTIONS.items():
            criteria = question.criteria
            self.assertIsInstance(criteria, dict, name)
            self.assertTrue(criteria.get("true"), name)
            self.assertTrue(criteria.get("false"), name)

    def test_question_revision_follows_numbered_convention(self):
        self.assertRegex(MODERATION_QUESTION_REVISION, r"^jev-mq-\d+$")


if __name__ == "__main__":
    unittest.main()
