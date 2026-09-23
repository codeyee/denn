"""Offline privacy and safety checks for Jev evaluation preflight."""
import json
import os
from io import StringIO
from pathlib import Path
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, override_settings

from content.management.commands import evaluate_jev_moderation

FIXTURE = Path(__file__).parent / "fixtures" / "jev_moderation_gold_cases_v1.json"
CASE_ID = "case_8a9720d1c46f"


class EvaluationPreflightCommandTests(SimpleTestCase):
    def setUp(self):
        self.env = patch.dict(os.environ, {"TYPESAFE_API_KEY": "test-only-placeholder"})
        self.env.start()
        self.addCleanup(self.env.stop)
        self.settings = override_settings(
            MODERATION_CLASSIFICATION_ENABLED=True,
            MODERATION_MODEL="jev-1.13.0",
            MODERATION_QUESTION_REVISION="q3",
        )
        self.settings.enable()
        self.addCleanup(self.settings.disable)

    def run_preflight(self, case_ids=CASE_ID, limit=1, **overrides):
        stdout = StringIO()
        options = {"dataset": str(FIXTURE)}
        options.update({
            "case_ids": case_ids,
            "limit": limit,
            "input_price_per_million_tokens": "0.042",
            "output_price_per_million_tokens": "0",
            "price_provenance": "typesafe-models-reviewed-2026-09-23",
            "dry_run": True,
        })
        options.update(overrides)
        call_command("evaluate_jev_moderation", stdout=stdout, **options)
        return stdout.getvalue().strip()

    def test_preflight_is_safe_and_never_constructs_a_client(self):
        self.assertNotIn("JevModerationClient", evaluate_jev_moderation.__dict__)
        output = self.run_preflight()
        report = json.loads(output)

        self.assertEqual(report["event"], "jev_moderation_live_evaluation_preflight")
        self.assertFalse(report["live_call_performed"])
        self.assertEqual((report["database_reads"], report["database_writes"]), (0, 0))
        self.assertEqual(report["case_ids"], [CASE_ID])
        self.assertEqual(report["maximum_inference_calls"], 1)
        self.assertEqual(report["requested_model"], "jev-1.13.0")
        self.assertEqual(report["question_revision"], "q3")
        self.assertTrue(report["ready_for_live_run"])
        self.assertTrue(report["api_key_present"])
        self.assertFalse(report["pricing_snapshot"]["cost_cap_enforced"])
        self.assertNotIn("Piedra Clara", output)
        self.assertNotIn("instrumentales tranquilos", output)

    def test_exact_selection_and_price_validation_fail_without_live_work(self):
        invalid_options = (
            {"case_ids": "case_aaaaaaaaaaaa"},
            {"case_ids": f"{CASE_ID},{CASE_ID}"},
            {"case_ids": f"{CASE_ID},case_4c1f7a9e0b63", "limit": 1},
            {"input_price_per_million_tokens": "-0.1"},
            {"price_provenance": "https://typesafe.ai/private"},
        )
        for overrides in invalid_options:
            with self.subTest(overrides=overrides):
                with self.assertRaises(CommandError):
                    self.run_preflight(**overrides)

    def test_readiness_flags_never_print_api_key_or_treat_alias_as_pinned(self):
        with override_settings(MODERATION_MODEL="jev-latest"):
            output = self.run_preflight()
        report = json.loads(output)
        self.assertFalse(report["concrete_model_pinned"])
        self.assertFalse(report["ready_for_live_run"])
        self.assertNotIn("test-only-placeholder", output)

        with override_settings(MODERATION_CLASSIFICATION_ENABLED=False), patch.dict(
            os.environ, {}, clear=True
        ):
            report = json.loads(self.run_preflight())
        self.assertFalse(report["classifier_enabled"])
        self.assertFalse(report["api_key_present"])
        self.assertFalse(report["ready_for_live_run"])
