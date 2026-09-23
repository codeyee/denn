"""Offline tests for the injectable TypeSafe moderation client (JEV-002A)."""
import os
import unittest
from unittest import mock

import httpx2
from typesafe_sdk import (
    SystemOneResponse,
    TypeSafeAPIResponseValidationError,
    TypeSafeAPIConnectionError,
    TypeSafeAPITimeoutError,
    TypeSafeBadRequestError,
    TypeSafeError,
    TypeSafeRateLimitError,
    RetryPolicy,
)

from content.moderation.client import JevModerationClient, ModerationJudgment
from content.moderation.errors import ModerationSkipped, ModerationUnavailable

SAMPLE_STATE = {
    "provider": "igdb",
    "content_type": "GAME",
    "title": "Sample",
    "description": "A sample description.",
    "genres": ["Action"],
    "tags": [],
}


def _settings_getter(**overrides):
    base = {"MODERATION_CLASSIFICATION_ENABLED": True, "MODERATION_MODEL": "jev-latest"}
    base.update(overrides)
    return base.get


class _RecordingClient:
    def __init__(self, response):
        self.response = response
        self.calls = []

    def system_one(self, state, questions, *, model=None, **kwargs):
        self.calls.append((state, tuple(sorted(questions)), model, kwargs))
        return self.response


def _noul_response(input_tokens=None, output_tokens=None):
    return SystemOneResponse.model_validate(
        {
            "model": "jev-latest",
            "usage": {"input_tokens": input_tokens, "output_tokens": output_tokens},
            "answers": {
                "safe_for_automatic_discovery": {"type": "noul", "noul": 0.02},
                "explicit_or_sensitive": {"type": "noul", "noul": 0.93},
                "needs_review": {"type": "noul", "noul": 0.0},
            },
        }
    )


class JevModerationClientTests(unittest.TestCase):
    def setUp(self):
        self.settings_getter = _settings_getter()

    def _client(self, response=None, **overrides):
        overrides["settings_getter"] = self.settings_getter
        return JevModerationClient(
            client=_RecordingClient(response or _noul_response()),
            **overrides,
        )

    def test_classify_returns_judgment_from_shared_questions(self):
        client = self._client()
        judgment = client.classify(SAMPLE_STATE)
        self.assertEqual(judgment.model, "jev-latest")
        self.assertEqual(judgment.nouls["safe_for_automatic_discovery"], 0.02)
        self.assertEqual(judgment.nouls["explicit_or_sensitive"], 0.93)
        self.assertEqual(judgment.nouls["needs_review"], 0.0)
        recorder = client._client
        state, questions, model, extra = recorder.calls[0]
        self.assertEqual(state, SAMPLE_STATE)
        self.assertEqual(
            questions,
            ("explicit_or_sensitive", "needs_review", "safe_for_automatic_discovery"),
        )
        self.assertEqual(model, "jev-latest")
        self.assertEqual(extra, {})

    def test_usage_is_preserved_from_the_sdk_response(self):
        client = JevModerationClient(
            client=_RecordingClient(_noul_response(input_tokens=11, output_tokens=3)),
            settings_getter=self.settings_getter,
        )
        judgment = client.classify(SAMPLE_STATE)
        self.assertEqual(judgment.usage.input_tokens, 11)
        self.assertEqual(judgment.usage.output_tokens, 3)
        self.assertNotHasLatency = not hasattr(judgment, "latency_ms")
        self.assertTrue(self.assertNotHasLatency)

    def test_classify_is_repeatable_with_identical_payloads(self):
        client = self._client()
        first = client.classify(SAMPLE_STATE)
        second = client.classify(SAMPLE_STATE)
        self.assertEqual(first.nouls, second.nouls)
        self.assertEqual(first.model, second.model)
        recorder = client._client
        self.assertEqual(len(recorder.calls), 2)
        self.assertEqual(recorder.calls[0][1:], recorder.calls[1][1:])

    def test_disabled_mode_returns_typed_skipped_outcome_without_any_call(self):
        disabled_getter = _settings_getter(MODERATION_CLASSIFICATION_ENABLED=False)
        client = JevModerationClient(
            client_factory=lambda: (_ for _ in ()).throw(
                AssertionError("disabled mode must not construct a client")
            ),
            settings_getter=disabled_getter,
        )
        result = client.classify(SAMPLE_STATE)
        self.assertIsInstance(result, ModerationSkipped)
        self.assertEqual(result.code, "moderation_disabled")

    def test_missing_classification_gate_defaults_to_disabled(self):
        settings_getter = lambda _name: None  # noqa: E731
        recorder = _RecordingClient(_noul_response())
        client = JevModerationClient(client=recorder, settings_getter=settings_getter)
        result = client.classify(SAMPLE_STATE)
        self.assertIsInstance(result, ModerationSkipped)

    def test_default_factory_disables_sdk_retries_without_api_key_or_network(self):
        with mock.patch.dict(os.environ):
            os.environ.pop("TYPESAFE_API_KEY", None)
            with mock.patch("content.moderation.client.TypeSafeClient") as sdk_factory:
                expected_client = object()
                sdk_factory.return_value = expected_client

                client = JevModerationClient(settings_getter=self.settings_getter)
                self.assertIs(client._resolve_client(), expected_client)

        sdk_factory.assert_called_once()
        retry_policy = sdk_factory.call_args.kwargs["retry"]
        self.assertIsInstance(retry_policy, RetryPolicy)
        self.assertEqual(retry_policy.max_retries, 0)

    def test_default_factory_without_api_key_fails_fast_without_network(self):
        with mock.patch.dict(os.environ):
            os.environ.pop("TYPESAFE_API_KEY", None)
            with self.assertRaises(TypeSafeError):
                JevModerationClient.default_client_factory()

    def test_default_client_resolution_wraps_config_error(self):
        def _failing_factory():
            raise TypeSafeError("no api key")

        client = JevModerationClient(
            client_factory=_failing_factory, settings_getter=self.settings_getter
        )
        with self.assertRaises(ModerationUnavailable) as cm:
            client.classify(SAMPLE_STATE)
        self.assertEqual(cm.exception.code, "typesafe_config")

    def test_rate_limit_error_maps_with_retry_after_ms(self):
        class _RateLimited:
            def system_one(self, state, questions, **kwargs):
                raise TypeSafeRateLimitError(
                    429, None, httpx2.Headers({"retry-after-ms": "1500"})
                )

        client = JevModerationClient(
            client=_RateLimited(), settings_getter=self.settings_getter
        )
        with self.assertRaises(ModerationUnavailable) as cm:
            client.classify(SAMPLE_STATE)
        self.assertEqual(cm.exception.code, "typesafe_rate_limited")
        self.assertEqual(cm.exception.retry_after_ms, 1500)

    def test_timeout_error_maps_to_unavailable(self):
        class _Timeout:
            def system_one(self, state, questions, **kwargs):
                raise TypeSafeAPITimeoutError(30.0)

        client = JevModerationClient(
            client=_Timeout(), settings_getter=self.settings_getter
        )
        with self.assertRaises(ModerationUnavailable) as cm:
            client.classify(SAMPLE_STATE)
        self.assertEqual(cm.exception.code, "typesafe_timeout")
        self.assertIsNone(cm.exception.retry_after_ms)

    def test_connection_error_maps_to_unavailable(self):
        class _Connection:
            def system_one(self, state, questions, **kwargs):
                raise TypeSafeAPIConnectionError()

        client = JevModerationClient(
            client=_Connection(), settings_getter=self.settings_getter
        )
        with self.assertRaises(ModerationUnavailable) as cm:
            client.classify(SAMPLE_STATE)
        self.assertEqual(cm.exception.code, "typesafe_connection")

    def test_api_error_maps_to_unavailable(self):
        class _ApiError:
            def system_one(self, state, questions, **kwargs):
                raise TypeSafeBadRequestError(
                    400, {"message": "bad"}, httpx2.Headers()
                )

        client = JevModerationClient(
            client=_ApiError(), settings_getter=self.settings_getter
        )
        with self.assertRaises(ModerationUnavailable) as cm:
            client.classify(SAMPLE_STATE)
        self.assertEqual(cm.exception.code, "typesafe_api_error")

    def test_response_validation_error_maps_to_unavailable_invalid(self):
        class _Invalid:
            def system_one(self, state, questions, **kwargs):
                raise TypeSafeAPIResponseValidationError(
                    200, {"answers": {}}, httpx2.Headers(), "answers.safe_for_automatic_discovery"
                )

        client = JevModerationClient(
            client=_Invalid(), settings_getter=self.settings_getter
        )
        with self.assertRaises(ModerationUnavailable) as cm:
            client.classify(SAMPLE_STATE)
        self.assertEqual(cm.exception.code, "typesafe_response_invalid")


if __name__ == "__main__":
    unittest.main()
