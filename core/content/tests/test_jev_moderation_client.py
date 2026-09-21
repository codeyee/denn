"""Offline tests for the injectable TypeSafe moderation client (JEV-002A)."""
import unittest

import httpx2
from typesafe_sdk import (
    SystemOneResponse,
    TypeSafeAPIResponseValidationError,
    TypeSafeAPIConnectionError,
    TypeSafeAPITimeoutError,
    TypeSafeBadRequestError,
    TypeSafeClient,
    TypeSafeError,
    TypeSafeRateLimitError,
)

from content.moderation.client import JevModerationClient, ModerationJudgment
from content.moderation.errors import ModerationUnavailable

SAMPLE_STATE = {
    "provider": "igdb",
    "content_type": "GAME",
    "title": "Sample",
    "description": "A sample description.",
    "genres": ["Action"],
    "tags": [],
}


class _RecordingClient:
    def __init__(self, response):
        self.response = response
        self.calls = []

    def system_one(self, state, questions, *, model=None, **kwargs):
        self.calls.append((state, tuple(sorted(questions)), model, kwargs))
        return self.response


def _noul_response():
    return SystemOneResponse.model_validate(
        {
            "model": "jev-1.13.0",
            "usage": {},
            "answers": {
                "adult_content": {"type": "noul", "noul": 0.93},
                "graphic_violence": {"type": "noul", "noul": 0.05},
                "offensive_content": {"type": "noul", "noul": 0.0},
            },
        }
    )


class JevModerationClientTests(unittest.TestCase):
    def test_classify_returns_judgment_from_shared_questions(self):
        recorder = _RecordingClient(_noul_response())
        judgment = JevModerationClient(client=recorder).classify(SAMPLE_STATE)
        self.assertEqual(judgment.model, "jev-1.13.0")
        self.assertEqual(judgment.nouls["adult_content"], 0.93)
        self.assertEqual(judgment.nouls["graphic_violence"], 0.05)
        self.assertEqual(judgment.nouls["offensive_content"], 0.0)
        state, questions, model, extra = recorder.calls[0]
        self.assertEqual(state, SAMPLE_STATE)
        self.assertEqual(
            questions, ("adult_content", "graphic_violence", "offensive_content")
        )
        self.assertIsNone(model)
        self.assertEqual(extra, {})

    def test_classify_is_repeatable_with_identical_payloads(self):
        recorder = _RecordingClient(_noul_response())
        client = JevModerationClient(client=recorder)
        first = client.classify(SAMPLE_STATE)
        second = client.classify(SAMPLE_STATE)
        self.assertEqual(first.nouls, second.nouls)
        self.assertEqual(first.model, second.model)
        self.assertEqual(len(recorder.calls), 2)
        self.assertEqual(recorder.calls[0][1:], recorder.calls[1][1:])

    def test_default_client_factory_is_the_real_sync_client(self):
        self.assertIs(JevModerationClient.default_client_factory, TypeSafeClient)

    def test_default_factory_without_api_key_fails_fast(self):
        with self.assertRaises(TypeSafeError):
            JevModerationClient.default_client_factory()

    def test_default_client_resolution_wraps_config_error(self):
        client = JevModerationClient()
        with self.assertRaises(ModerationUnavailable) as cm:
            client.classify(SAMPLE_STATE)
        self.assertEqual(cm.exception.code, "typesafe_config")

    def test_librate_limit_error_maps_with_retry_after_ms(self):
        class _RateLimited:
            def system_one(self, state, questions, **kwargs):
                raise TypeSafeRateLimitError(
                    429, None, httpx2.Headers({"retry-after-ms": "1500"})
                )

        with self.assertRaises(ModerationUnavailable) as cm:
            JevModerationClient(client=_RateLimited()).classify(SAMPLE_STATE)
        self.assertEqual(cm.exception.code, "typesafe_rate_limited")
        self.assertEqual(cm.exception.retry_after_ms, 1500)

    def test_timeout_error_maps_to_unavailable(self):
        class _Timeout:
            def system_one(self, state, questions, **kwargs):
                raise TypeSafeAPITimeoutError(30.0)

        with self.assertRaises(ModerationUnavailable) as cm:
            JevModerationClient(client=_Timeout()).classify(SAMPLE_STATE)
        self.assertEqual(cm.exception.code, "typesafe_timeout")
        self.assertIsNone(cm.exception.retry_after_ms)

    def test_connection_error_maps_to_unavailable(self):
        class _Connection:
            def system_one(self, state, questions, **kwargs):
                raise TypeSafeAPIConnectionError()

        with self.assertRaises(ModerationUnavailable) as cm:
            JevModerationClient(client=_Connection()).classify(SAMPLE_STATE)
        self.assertEqual(cm.exception.code, "typesafe_connection")

    def test_api_error_maps_to_unavailable(self):
        class _ApiError:
            def system_one(self, state, questions, **kwargs):
                raise TypeSafeBadRequestError(
                    400, {"message": "bad"}, httpx2.Headers()
                )

        with self.assertRaises(ModerationUnavailable) as cm:
            JevModerationClient(client=_ApiError()).classify(SAMPLE_STATE)
        self.assertEqual(cm.exception.code, "typesafe_api_error")

    def test_response_validation_error_maps_to_unavailable_invalid(self):
        class _Invalid:
            def system_one(self, state, questions, **kwargs):
                raise TypeSafeAPIResponseValidationError(
                    200, {"answers": {}}, httpx2.Headers(), "answers.adult_content"
                )

        with self.assertRaises(ModerationUnavailable) as cm:
            JevModerationClient(client=_Invalid()).classify(SAMPLE_STATE)
        self.assertEqual(cm.exception.code, "typesafe_response_invalid")



if __name__ == "__main__":
    unittest.main()
