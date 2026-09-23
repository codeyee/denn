"""Offline tests for supplied latency, token usage, and cost reporting."""
import json
import unittest
from pathlib import Path

from content.moderation.evaluation_accounting import EvaluationAccountingValidationError
from content.moderation.evaluation_metrics import build_evaluation_report

FIXTURE = Path(__file__).parent / "fixtures" / "jev_moderation_gold_cases_v1.json"


def dataset():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def observation(case, *, inputs=10, outputs=2, attempted=True, received=True):
    return {
        "case_id": case["case_id"],
        "jev_prediction": case["gold_class"] if attempted else "skipped",
        "policy_prediction": case["gold_class"] if attempted else "unknown",
        "inference_attempted": attempted,
        "response_received": received,
        "reported_model": "jev-1.13.0" if received else None,
        "input_tokens": inputs if received else None,
        "output_tokens": outputs if received else None,
        "failure_code": None,
    }


class ModerationEvaluationAccountingTests(unittest.TestCase):
    def test_supplied_latency_and_complete_cost_are_reported_with_provenance(self):
        raw = dataset()
        observations = [
            observation(raw["cases"][0], inputs=10, outputs=2),
            observation(raw["cases"][1], inputs=10, outputs=5),
            observation(raw["cases"][2], inputs=20, outputs=5),
        ]
        durations = {case["case_id"]: value for case, value in zip(raw["cases"], (10, 20, 30))}

        report = build_evaluation_report(
            raw, observations, durations_ms=durations,
            price_per_million_input_tokens=2,
            price_per_million_output_tokens=4,
            price_provenance="offline-rate-card-v1",
        )

        self.assertEqual(report["latency_ms"]["supplied_count"], 3)
        self.assertEqual(report["latency_ms"]["missing_count"], 0)
        self.assertEqual(report["latency_ms"]["p50"], 20)
        self.assertEqual(report["latency_ms"]["p95"], 29)
        self.assertIn("not SDK latency", report["latency_ms"]["source"])
        self.assertEqual(report["usage"]["input_tokens"]["known_total"], 40)
        self.assertEqual(report["usage"]["output_tokens"]["known_total"], 12)
        self.assertEqual(report["usage"]["missing_usage_count"], 0)
        self.assertEqual(report["usage"]["cost"]["known_usage_cost_usd"], "0.00012800")
        self.assertEqual(report["usage"]["cost"]["total_usd"], "0.00012800")
        self.assertEqual(report["usage"]["cost"]["status"], "complete")
        self.assertEqual(report["usage"]["cost"]["price_provenance"], "offline-rate-card-v1")

    def test_missing_usage_keeps_known_partial_totals_and_nulls_complete_cost(self):
        raw = dataset()
        observations = [
            observation(raw["cases"][0], inputs=10, outputs=2),
            observation(raw["cases"][1], inputs=None, outputs=5),
            observation(raw["cases"][2], inputs=20, outputs=5),
        ]
        report = build_evaluation_report(
            raw, observations,
            price_per_million_input_tokens=2,
            price_per_million_output_tokens=4,
            price_provenance="offline-rate-card-v1",
        )

        self.assertEqual(report["usage"]["input_tokens"]["known_total"], 30)
        self.assertEqual(report["usage"]["output_tokens"]["known_total"], 12)
        self.assertEqual(report["usage"]["missing_usage_count"], 1)
        self.assertEqual(report["usage"]["cost"]["known_usage_cost_usd"], "0.00010800")
        self.assertIsNone(report["usage"]["cost"]["total_usd"])
        self.assertEqual(report["usage"]["cost"]["status"], "incomplete_usage")

    def test_no_or_partial_prices_are_not_misreported_as_complete_cost(self):
        raw = dataset()
        skipped = [
            observation(raw["cases"][0], attempted=False, received=False),
            observation(raw["cases"][1], attempted=False, received=False),
            observation(raw["cases"][2], attempted=False, received=False),
        ]
        observations = [observation(case) for case in raw["cases"]]
        unpriced = build_evaluation_report(raw, observations)
        partial = build_evaluation_report(
            raw, observations,
            price_per_million_input_tokens=2,
            price_provenance="offline-rate-card-v1",
        )
        no_inference = build_evaluation_report(
            raw, skipped,
            price_per_million_input_tokens=2,
            price_provenance="offline-rate-card-v1",
        )

        self.assertEqual(unpriced["usage"]["cost"]["status"], "not_priced")
        self.assertIsNone(unpriced["usage"]["cost"]["total_usd"])
        self.assertEqual(partial["usage"]["cost"]["status"], "missing_price_rate")
        self.assertIsNone(partial["usage"]["cost"]["total_usd"])
        self.assertEqual(no_inference["usage"]["cost"]["status"], "no_inference_usage")
        self.assertIsNone(no_inference["usage"]["cost"]["known_usage_cost_usd"])

    def test_invalid_duration_price_and_provenance_values_are_rejected(self):
        raw = dataset()
        observations = [observation(case) for case in raw["cases"]]
        with self.assertRaises(EvaluationAccountingValidationError):
            build_evaluation_report(raw, observations, durations_ms={"case_deadbeef0000": 1})
        with self.assertRaises(EvaluationAccountingValidationError):
            build_evaluation_report(raw, observations, durations_ms={raw["cases"][0]["case_id"]: float("nan")})
        with self.assertRaises(EvaluationAccountingValidationError):
            build_evaluation_report(raw, observations, price_per_million_input_tokens=float("inf"))
        with self.assertRaises(EvaluationAccountingValidationError):
            build_evaluation_report(
                raw, observations, price_per_million_input_tokens=1,
                price_provenance="https://example.invalid/prices",
            )

    def test_empty_evaluation_has_no_fake_latency_or_inference_cost(self):
        raw = {"schema_version": "jev-moderation-gold-cases/v1", "cases": []}
        report = build_evaluation_report(
            raw, [],
            price_per_million_input_tokens=2,
            price_per_million_output_tokens=4,
            price_provenance="offline-rate-card-v1",
        )

        self.assertIsNone(report["latency_ms"]["p50"])
        self.assertIsNone(report["latency_ms"]["p95"])
        self.assertIsNone(report["usage"]["cost"]["known_usage_cost_usd"])
        self.assertIsNone(report["usage"]["cost"]["total_usd"])
        self.assertEqual(report["usage"]["cost"]["status"], "no_inference_usage")


if __name__ == "__main__":
    unittest.main()
