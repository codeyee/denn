"""Offline privacy and safety checks for Jev evaluation preflight."""
import json
import logging
import os
import copy
from io import StringIO
from pathlib import Path
from unittest.mock import Mock, patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import SimpleTestCase, override_settings

from content.management.commands import evaluate_jev_moderation
from content.moderation.client import ModerationJudgment, UsageTokens
from content.moderation.evaluation_orchestration import evaluate_dataset

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

    def run_live(self, case_ids=CASE_ID, limit=1, **overrides):
        stdout = StringIO()
        options = {
            "dataset": str(FIXTURE),
            "case_ids": case_ids,
            "limit": limit,
            "input_price_per_million_tokens": "0.042",
            "output_price_per_million_tokens": "0",
            "price_provenance": "typesafe-models-reviewed-2026-09-23",
            "confirm_live": True,
        }
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
            {"limit": 26},
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

    def test_live_mode_uses_configured_identity_and_emits_only_safe_report_fields(self):
        sdk_logger = logging.getLogger("typesafe_sdk")
        was_disabled = sdk_logger.disabled

        def classify(state):
            self.assertTrue(sdk_logger.disabled)
            return ModerationJudgment(
                model="jev-1.13.0",
                nouls={
                    "safe_for_automatic_discovery": 0.1,
                    "explicit_or_sensitive": 0.9,
                    "needs_review": 0.1,
                },
                usage=UsageTokens(input_tokens=100, output_tokens=0),
            )

        fake_client = Mock()
        fake_client.classify.side_effect = classify
        with patch(
            "content.moderation.client.JevModerationClient", return_value=fake_client
        ) as client_factory:
            output = self.run_live()

        report = json.loads(output)
        client_factory.assert_called_once_with(model="jev-1.13.0")
        fake_client.classify.assert_called_once()
        sent_state = fake_client.classify.call_args.args[0]
        self.assertIn("title", sent_state)
        self.assertEqual(report["requested_model"], "jev-1.13.0")
        self.assertEqual(sdk_logger.disabled, was_disabled)
        self.assertEqual(report["question_revision"], "q3")
        self.assertEqual(report["report"]["evaluation_identity"]["requested_model"], "jev-1.13.0")
        self.assertEqual(report["report"]["cases"][0]["jev_prediction"], "explicit_or_sensitive")
        self.assertEqual(report["report"]["usage"]["cost"]["status"], "complete")
        self.assertFalse(report["cost_cap_enforced"])
        self.assertEqual(report["max_sdk_retries"], 0)
        self.assertGreaterEqual(report["elapsed_ms"], 0)
        self.assertNotIn("Piedra Clara", output)
        self.assertNotIn("instrumentales tranquilos", output)
        self.assertNotIn('"state":', output)
        self.assertNotIn("request_body", output)
        self.assertNotIn("test-only-placeholder", output)

    def test_affirmative_tmdb_override_is_reported_without_classifier_call(self):
        fake_client = Mock()
        with patch(
            "content.moderation.client.JevModerationClient", return_value=fake_client
        ):
            with patch.dict(os.environ, {}, clear=True), override_settings(
                MODERATION_CLASSIFICATION_ENABLED=False
            ):
                output = self.run_live(case_ids="case_17b0c3a43d12")

        report = json.loads(output)
        self.assertFalse(report["live_call_performed"])
        self.assertEqual(report["report"]["execution"]["provider_override_no_call_count"], 1)
        fake_client.classify.assert_not_called()

    def test_live_mode_refuses_unsafe_configuration_before_constructing_client(self):
        with patch("content.moderation.client.JevModerationClient") as client_factory:
            with override_settings(MODERATION_MODEL="jev-latest"):
                with self.assertRaisesRegex(CommandError, "concrete pinned"):
                    self.run_live()
            with override_settings(MODERATION_QUESTION_REVISION="private revision text"):
                with self.assertRaisesRegex(CommandError, "safe revision") as raised:
                    self.run_live()
                self.assertNotIn("private revision text", str(raised.exception))
            with patch.dict(os.environ, {}, clear=True):
                with self.assertRaisesRegex(CommandError, "TYPESAFE_API_KEY"):
                    self.run_live()
            with override_settings(MODERATION_CLASSIFICATION_ENABLED=False):
                with self.assertRaisesRegex(
                    CommandError, r'exact case-sensitive string "True"'
                ):
                    self.run_live()
            client_factory.assert_not_called()

    def test_serialized_state_limit_accepts_20000_bytes_and_rejects_20001(self):
        def sized_case(byte_count):
            source_cases = json.loads(FIXTURE.read_text(encoding="utf-8"))["cases"]
            case = copy.deepcopy(next(case for case in source_cases if case["case_id"] == CASE_ID))
            case["state"]["description"] = ""
            state_size = len(json.dumps(case["state"], ensure_ascii=False).encode("utf-8"))
            case["state"]["description"] = "x" * (byte_count - state_size)
            self.assertEqual(
                len(json.dumps(case["state"], ensure_ascii=False).encode("utf-8")), byte_count
            )
            return case

        for byte_count, should_pass in ((20_000, True), (20_001, False)):
            with self.subTest(byte_count=byte_count):
                with patch(
                    "content.management.commands.evaluate_jev_moderation.load_gold_dataset",
                    return_value=(sized_case(byte_count),),
                ):
                    if should_pass:
                        report = json.loads(self.run_preflight())
                        self.assertTrue(report["ready_for_live_run"])
                    else:
                        with self.assertRaisesRegex(CommandError, "20000 UTF-8 bytes"):
                            self.run_preflight()

    def test_nested_report_projection_drops_untrusted_fields_at_every_depth(self):
        marker = "PRIVATE_STATE_MARKER"
        client = Mock()
        client.classify.return_value = ModerationJudgment(
            model="jev-1.13.0",
            nouls={
                "safe_for_automatic_discovery": 0.1,
                "explicit_or_sensitive": 0.9,
                "needs_review": 0.1,
            },
            usage=UsageTokens(input_tokens=100, output_tokens=0),
        )
        source = evaluate_dataset(
            json.loads(FIXTURE.read_text(encoding="utf-8")),
            client=client,
            requested_model="jev-1.13.0",
            question_revision="q3",
            selected_case_ids=(CASE_ID,),
            price_per_million_input_tokens=0.042,
            price_per_million_output_tokens=0.0,
            price_provenance="typesafe-models-reviewed-2026-09-23",
        )
        source["schema_version"] = "attacker-controlled"
        source["go_no_go"]["status"] = "APPROVED"
        source["execution"]["retry_scope"] = marker
        source["latency_ms"]["source"] = marker
        source["model_consistency"]["resolved_model_counts"]["private_model"] = marker
        source["provider_breakdown"]["unknown_provider"] = {"raw_state": marker}

        def inject_unknowns(value):
            if isinstance(value, dict):
                children = tuple(value.values())
                value["raw_payload"] = {"title": marker}
                for child in children:
                    inject_unknowns(child)
            elif isinstance(value, list):
                for child in value:
                    inject_unknowns(child)

        inject_unknowns(source)
        projected = evaluate_jev_moderation._safe_live_report(source)
        serialized = json.dumps(projected)

        self.assertNotIn(marker, serialized)
        self.assertNotIn("raw_payload", serialized)
        self.assertNotIn("unknown_provider", serialized)
        self.assertEqual(projected["schema_version"], "jev-moderation-evaluation-report/v2")
        self.assertEqual(projected["go_no_go"]["status"], "INSUFFICIENT")
        self.assertEqual(projected["usage"]["input_tokens"]["known_total"], 100)
        self.assertEqual(projected["usage"]["cost"]["total_usd"], "0.00000420")
        self.assertEqual(projected["execution"]["retry_scope"], "production TypeSafe adapter retries disabled; evaluator retries disabled")
        self.assertEqual(projected["cases"][0]["jev_prediction"], "explicit_or_sensitive")

    def test_live_failure_restores_sdk_logger_and_redacts_error_message(self):
        sdk_logger = logging.getLogger("typesafe_sdk")
        was_disabled = sdk_logger.disabled
        fake_client = Mock()

        def fail_with_sensitive_error(_state):
            self.assertTrue(sdk_logger.disabled)
            raise RuntimeError("private request body and response secret")

        fake_client.classify.side_effect = fail_with_sensitive_error
        with patch(
            "content.moderation.client.JevModerationClient", return_value=fake_client
        ):
            output = self.run_live()

        self.assertEqual(sdk_logger.disabled, was_disabled)
        self.assertNotIn("private request body", output)
        self.assertNotIn("response secret", output)
        self.assertEqual(json.loads(output)["report"]["cases"][0]["failure_code"], "client_error")

    def test_report_projection_discards_future_or_accidental_payload_fields(self):
        projected = evaluate_jev_moderation._safe_live_report({
            "cases": [{
                "case_id": CASE_ID,
                "gold_class": "safe_for_automatic_discovery",
                "jev_prediction": "safe_for_automatic_discovery",
                "state": {"title": "private title"},
                "raw_request": "private request",
            }],
            "raw_response": "private response",
        })

        self.assertEqual(projected["cases"], [{
            "case_id": CASE_ID,
            "gold_class": "safe_for_automatic_discovery",
            "jev_prediction": "safe_for_automatic_discovery",
        }])
        self.assertNotIn("raw_response", projected)
