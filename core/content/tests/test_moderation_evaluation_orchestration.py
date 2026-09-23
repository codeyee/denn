"""Offline tests for the injected-client evaluator; no Jev or provider calls."""
import json
import unittest
from copy import deepcopy
from pathlib import Path
from unittest.mock import patch

from content.moderation.client import ModerationJudgment, UsageTokens
from content.moderation.evaluation_orchestration import evaluate_dataset

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

if __name__ == "__main__":
    unittest.main()
