"""Deterministic classification-report tests; no client, Jev, or database calls."""
import json
import unittest
from pathlib import Path

from content.moderation.evaluation_cases import GOLD_CLASSES
from content.moderation.evaluation_metrics import (
    EvaluationReportValidationError,
    build_evaluation_report,
)

FIXTURE = Path(__file__).parent / "fixtures" / "jev_moderation_gold_cases_v1.json"


def dataset():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def observation(case, prediction, *, policy=None, attempted=True, received=True,
                model="jev-1.13.0", inputs=10, outputs=2, failure=None):
    policy_prediction = policy if policy is not None else (
        "explicit_or_sensitive" if case["provider_explicit"] is True else prediction
    )
    return {
        "case_id": case["case_id"],
        "jev_prediction": prediction,
        "policy_prediction": policy_prediction,
        "inference_attempted": attempted,
        "response_received": received,
        "reported_model": model if received else None,
        "input_tokens": inputs if received else None,
        "output_tokens": outputs if received else None,
        "failure_code": failure,
    }


class ModerationEvaluationMetricsTests(unittest.TestCase):
    def test_confusion_rates_retain_failures_and_separate_provider_override(self):
        raw = dataset()
        results = [
            observation(raw["cases"][0], "safe_for_automatic_discovery", policy="explicit_or_sensitive"),
            observation(raw["cases"][1], "safe_for_automatic_discovery"),
            observation(raw["cases"][2], "unavailable", policy="needs_review", received=False, failure="typesafe_timeout"),
        ]
        report = build_evaluation_report(raw, results)

        self.assertEqual(list(report["confusion_matrix_jev_only"]), list(GOLD_CLASSES))
        self.assertEqual(report["schema_version"], "jev-moderation-evaluation-report/v2")
        self.assertEqual(report["confusion_matrix_jev_only"]["explicit_or_sensitive"]["safe_for_automatic_discovery"], 1)
        self.assertEqual(report["confusion_matrix_policy_including_provider_override"]["explicit_or_sensitive"]["explicit_or_sensitive"], 1)
        self.assertEqual(report["explicit_false_negative_rate_gold_explicit_to_predicted_safe"], {
            "value": 1.0, "display": "100.00%", "numerator": 1, "denominator": 1,
        })
        self.assertEqual(report["per_class_jev_only"]["safe_for_automatic_discovery"]["precision"]["denominator"], 2)
        self.assertEqual(report["per_class_jev_only"]["needs_review"]["recall"]["denominator"], 1)
        self.assertEqual(report["review_recall_jev_only"]["value"], 0.0)
        self.assertTrue(report["cases"][0]["provider_override_changed_prediction"])
        self.assertFalse(report["cases"][1]["provider_override_applied"])
        self.assertEqual(report["coverage"]["jev_only"]["outcome_counts"]["unavailable"], 1)
        self.assertEqual(report["coverage"]["final_policy"]["outcome_counts"]["needs_review"], 1)
        tmdb_quality = report["provider_breakdown"]["tmdb"]["quality"]
        self.assertEqual(
            tmdb_quality["jev_only"]["explicit_false_negative_rate_gold_explicit_to_predicted_safe"],
            {"value": 1.0, "display": "100.00%", "numerator": 1, "denominator": 1},
        )
        self.assertEqual(
            tmdb_quality["final_policy"]["explicit_false_negative_rate_gold_explicit_to_predicted_safe"],
            {"value": 0.0, "display": "0.00%", "numerator": 0, "denominator": 1},
        )
        english_quality = report["language_breakdown"]["en"]["quality"]
        self.assertEqual(
            english_quality["jev_only"]["explicit_false_negative_rate_gold_explicit_to_predicted_safe"],
            {"value": 1.0, "display": "100.00%", "numerator": 1, "denominator": 1},
        )
        self.assertEqual(
            english_quality["final_policy"]["explicit_false_negative_rate_gold_explicit_to_predicted_safe"],
            {"value": 0.0, "display": "0.00%", "numerator": 0, "denominator": 1},
        )
        spotify_quality = report["provider_breakdown"]["spotify"]["quality"]["jev_only"]
        self.assertEqual(
            spotify_quality["per_class"]["safe_for_automatic_discovery"]["recall"]["denominator"], 1
        )
        self.assertEqual(
            spotify_quality["per_class"]["explicit_or_sensitive"]["recall"],
            {"value": None, "display": "N/A", "numerator": 0, "denominator": 0},
        )
        spanish_quality = report["language_breakdown"]["es"]["quality"]
        self.assertEqual(spanish_quality["jev_only"]["review_recall_gold_needs_review"]["value"], 0.0)
        self.assertEqual(spanish_quality["final_policy"]["review_recall_gold_needs_review"]["value"], 1.0)
        self.assertEqual(
            spanish_quality["jev_only"]["explicit_false_negative_rate_gold_explicit_to_predicted_safe"],
            {"value": None, "display": "N/A", "numerator": 0, "denominator": 0},
        )
        self.assertEqual(spanish_quality["final_policy"]["coverage"]["needs_review_abstention_rate"]["denominator"], 2)
        self.assertEqual(report["provider_breakdown"]["spotify"]["case_count"], 1)
        self.assertEqual(report["language_breakdown"]["es"]["case_count"], 2)
        self.assertEqual(report["go_no_go"]["status"], "INSUFFICIENT")

    def test_true_tmdb_provider_override_rejects_non_explicit_policy_outcomes(self):
        raw = dataset()
        results = [
            observation(raw["cases"][0], "safe_for_automatic_discovery", policy="safe_for_automatic_discovery"),
            observation(raw["cases"][1], "safe_for_automatic_discovery"),
            observation(raw["cases"][2], "needs_review"),
        ]

        with self.assertRaisesRegex(EvaluationReportValidationError, "TMDB explicit override"):
            build_evaluation_report(raw, results)

    def test_unknown_unavailable_and_skipped_have_distinct_coverage(self):
        raw = dataset()
        results = [
            observation(raw["cases"][0], "unknown", received=False, failure="invalid_response"),
            observation(raw["cases"][1], "skipped", attempted=False, received=False, failure="moderation_disabled"),
            observation(raw["cases"][2], "unavailable", received=False, failure="client_error"),
        ]
        report = build_evaluation_report(raw, results)

        self.assertEqual(report["case_count"], 3)
        self.assertEqual(report["coverage"]["jev_only"]["outcome_counts"]["unknown"], 1)
        self.assertEqual(report["coverage"]["jev_only"]["outcome_counts"]["unavailable"], 1)
        self.assertEqual(report["coverage"]["jev_only"]["outcome_counts"]["skipped"], 1)
        self.assertEqual(report["per_class_jev_only"]["explicit_or_sensitive"]["recall"]["denominator"], 1)

    def test_jev_and_final_policy_needs_review_rates_use_separate_case_denominators(self):
        raw = dataset()
        results = [
            observation(raw["cases"][0], "needs_review"),
            observation(raw["cases"][1], "safe_for_automatic_discovery", policy="needs_review"),
            observation(raw["cases"][2], "unavailable", policy="needs_review", received=False, failure="typesafe_timeout"),
        ]
        report = build_evaluation_report(raw, results)

        self.assertEqual(report["coverage"]["total_case_count"], 3)
        self.assertEqual(report["coverage"]["jev_only"]["needs_review_abstention_rate"], {
            "value": 0.333333, "display": "33.33%", "numerator": 1, "denominator": 3,
        })
        self.assertEqual(report["coverage"]["final_policy"]["needs_review_abstention_rate"], {
            "value": 0.666667, "display": "66.67%", "numerator": 2, "denominator": 3,
        })

    def test_zero_denominators_and_model_mixtures_are_explicit(self):
        empty = {"schema_version": "jev-moderation-gold-cases/v1", "cases": []}
        report = build_evaluation_report(empty, [])
        metric = report["per_class_jev_only"]["explicit_or_sensitive"]["recall"]
        self.assertEqual(metric, {"value": None, "display": "N/A", "numerator": 0, "denominator": 0})
        self.assertEqual(report["explicit_false_negative_rate_gold_explicit_to_predicted_safe"]["display"], "N/A")
        self.assertEqual(report["coverage"]["final_policy"]["needs_review_abstention_rate"]["display"], "N/A")

        raw = dataset()
        results = [
            observation(raw["cases"][0], "safe_for_automatic_discovery", model="jev-1.13.0"),
            observation(raw["cases"][1], "explicit_or_sensitive", model="jev-1.14.0"),
            observation(raw["cases"][2], "needs_review", model="jev-latest"),
        ]
        report = build_evaluation_report(raw, results)
        self.assertTrue(report["model_consistency"]["mixed_model_versions"])
        self.assertFalse(report["model_consistency"]["single_version_eligible"])
        self.assertFalse(report["go_no_go"]["single_version_eligible"])

    def test_every_case_needs_a_safe_unique_observation(self):
        raw = dataset()
        results = [observation(case, "safe_for_automatic_discovery") for case in raw["cases"]]
        with self.assertRaises(EvaluationReportValidationError):
            build_evaluation_report(raw, results[:-1])
        results[0]["private_details"] = "no"
        with self.assertRaises(EvaluationReportValidationError):
            build_evaluation_report(raw, results)
        results[0].pop("private_details")
        results[0]["failure_code"] = "token=secret-value"
        with self.assertRaises(EvaluationReportValidationError):
            build_evaluation_report(raw, results)


if __name__ == "__main__":
    unittest.main()
