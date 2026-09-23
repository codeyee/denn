"""Offline tests for the injected-client evaluator; no Jev or provider calls."""
import json
import unittest
from copy import deepcopy
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

from content.moderation.client import JevModerationClient, ModerationJudgment, UsageTokens
from content.moderation.errors import ModerationSkipped, ModerationUnavailable
import content.moderation.evaluation_orchestration as evaluator
from content.moderation.evaluation_orchestration import evaluate_dataset
from content.moderation.policy import PolicyThresholds

FIXTURE = Path(__file__).parent / "fixtures" / "jev_moderation_gold_cases_v1.json"


def load_fixture():
    return json.loads(FIXTURE.read_text(encoding="utf-8"))


def judgment(safe, explicit, review, *, model="jev-1.13.0", usage=None):
    return ModerationJudgment(
        model=model,
        nouls={
            "safe_for_automatic_discovery": safe,
            "explicit_or_sensitive": explicit,
            "needs_review": review,
        },
        usage=usage,
    )


class FakeClient:
    def __init__(self, outcomes):
        self.outcomes = iter(outcomes)
        self.states = []

    def classify(self, state):
        self.states.append(deepcopy(state))
        outcome = next(self.outcomes)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome


class ModerationEvaluationOrchestrationTests(unittest.TestCase):
    def evaluate(self, dataset, client, **kwargs):
        return evaluate_dataset(
            dataset,
            client=client,
            requested_model="jev-1.13.0",
            question_revision="q3",
            **kwargs,
        )

    def test_override_is_no_call_and_only_state_reaches_injected_client(self):
        dataset = load_fixture()
        eligible = dataset["cases"][1:]
        client = FakeClient([
            judgment(0.96, 0.02, 0.03, usage=UsageTokens(12, 4)),
            judgment(0.03, 0.02, 0.94, usage=None),
        ])
        timestamps = [0, 10_000_000, 20_000_000, 40_000_000]

        with patch(
            "content.moderation.evaluation_orchestration.time.perf_counter_ns",
            side_effect=timestamps,
        ):
            report = self.evaluate(dataset, client)

        self.assertEqual(client.states, [case["state"] for case in eligible])
        self.assertTrue(all("language" not in state for state in client.states))
        self.assertEqual(report["execution"], {
            "selected_case_count": 3,
            "classify_invocation_count": 2,
            "provider_override_no_call_count": 1,
            "evaluator_retry_count": 0,
            "retry_scope": "injected client transport retry behavior is not controlled here",
        })
        self.assertEqual(report["cases"][0]["jev_prediction"], "skipped")
        self.assertEqual(report["cases"][0]["policy_prediction"], "explicit_or_sensitive")
        self.assertEqual(report["cases"][0]["provider_override_applied"], True)
        self.assertEqual(report["cases"][1]["reported_model"], "jev-1.13.0")
        self.assertIsNone(report["cases"][2]["input_tokens"])
        self.assertEqual(report["latency_ms"]["p50"], 15)
        self.assertEqual(report["latency_ms"]["p95"], 19.5)
        self.assertIn("classify calls only", report["latency_ms"]["source"])
        serialized = json.dumps(report)
        for case in dataset["cases"]:
            self.assertNotIn(case["state"]["title"], serialized)
            self.assertNotIn(case["state"]["description"], serialized)
        self.assertEqual(report["evaluation_identity"]["question_revision"], "q3")
        self.assertEqual(report["evaluation_identity"]["policy"]["name"], "compose_policy")

    def test_latency_stops_before_result_parsing_and_policy_composition(self):
        dataset = load_fixture()
        selected = dataset["cases"][1]["case_id"]
        now_ns = [0]

        class AdvancingClient:
            def classify(self, state):
                now_ns[0] += 10_000_000
                return judgment(0.9, 0.1, 0.1)

        parse_result = evaluator._judgment_result

        def slow_parse(case, result, thresholds):
            now_ns[0] += 100_000_000
            return parse_result(case, result, thresholds)

        with patch.object(evaluator.time, "perf_counter_ns", side_effect=lambda: now_ns[0]):
            with patch.object(evaluator, "_judgment_result", side_effect=slow_parse):
                report = self.evaluate(dataset, AdvancingClient(), selected_case_ids=[selected])

        self.assertEqual(report["latency_ms"]["p50"], 10)

    def test_actual_adapter_is_injected_without_constructing_sdk(self):
        calls = []

        class FakeSdk:
            def system_one(self, state, questions, *, model):
                calls.append((state, questions, model))
                return SimpleNamespace(
                    model="jev-1.13.0",
                    nouls={
                        name: SimpleNamespace(noul=value)
                        for name, value in {
                            "safe_for_automatic_discovery": 0.9,
                            "explicit_or_sensitive": 0.1,
                            "needs_review": 0.1,
                        }.items()
                    },
                    usage=SimpleNamespace(input_tokens=7, output_tokens=3),
                )

        adapter = JevModerationClient(
            client=FakeSdk(), model="jev-1.13.0", settings_getter=lambda name: True,
        )
        dataset = load_fixture()
        selected = dataset["cases"][1]["case_id"]
        report = self.evaluate(dataset, adapter, selected_case_ids=[selected])

        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0][2], "jev-1.13.0")
        self.assertEqual(report["cases"][0]["case_id"], selected)
        self.assertEqual(report["cases"][0]["input_tokens"], 7)
        self.assertEqual(report["cases"][0]["policy_prediction"], "safe_for_automatic_discovery")
        self.assertEqual(report["case_count"], 1)

    def test_typed_failures_and_unexpected_errors_keep_selected_cases(self):
        dataset = load_fixture()
        client = FakeClient([
            ModerationUnavailable("typesafe_timeout", detail="do not expose this detail"),
            RuntimeError("private response body"),
        ])
        report = self.evaluate(dataset, client)

        self.assertEqual(report["case_count"], 3)
        self.assertEqual(report["coverage"]["jev_only"]["outcome_counts"]["unavailable"], 2)
        self.assertEqual(report["cases"][1]["failure_code"], "typesafe_timeout")
        self.assertEqual(report["cases"][2]["failure_code"], "client_error")
        self.assertEqual(report["cases"][1]["policy_prediction"], "needs_review")
        self.assertEqual(report["per_class_jev_only"]["needs_review"]["recall"]["denominator"], 1)
        rendered = json.dumps(report)
        self.assertNotIn("private response body", rendered)
        self.assertNotIn("do not expose this detail", rendered)

    def test_typed_skip_unknown_and_policy_threshold_identity(self):
        dataset = load_fixture()
        client = FakeClient([
            ModerationSkipped("moderation_disabled"),
            judgment("not-a-probability", 0.2, 0.1, model="jev-latest"),
        ])
        report = self.evaluate(
            dataset,
            client,
            thresholds=PolicyThresholds(safe_min=0.8, explicit_at=0.8, review_at=0.7),
        )

        self.assertEqual(report["cases"][1]["jev_prediction"], "skipped")
        self.assertEqual(report["cases"][1]["failure_code"], "moderation_disabled")
        self.assertFalse(report["cases"][1]["inference_attempted"])
        self.assertEqual(report["cases"][2]["jev_prediction"], "unknown")
        self.assertEqual(report["cases"][2]["reported_model"], "jev-latest")
        self.assertFalse(report["model_consistency"]["single_version_eligible"])
        self.assertEqual(report["evaluation_identity"]["policy"]["thresholds"]["safe_min"], 0.8)

    def test_malformed_client_result_is_safe_unavailable_and_validation_precedes_calls(self):
        dataset = load_fixture()
        report = self.evaluate(dataset, FakeClient([object()]), selected_case_ids=[dataset["cases"][1]["case_id"]])
        self.assertEqual(report["cases"][0]["jev_prediction"], "unavailable")
        self.assertEqual(report["cases"][0]["failure_code"], "typesafe_response_invalid")

        client = FakeClient([])
        with self.assertRaises(ValueError):
            self.evaluate(dataset, client, selected_case_ids=["case_deadbeef0000"])
        with self.assertRaises(ValueError):
            evaluate_dataset(
                dataset,
                client=client,
                requested_model="https://bad.invalid/model",
                question_revision="q3",
            )
        self.assertEqual(client.states, [])

if __name__ == "__main__":
    unittest.main()
