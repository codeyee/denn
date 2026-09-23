"""Narrow adapter over the TypeSafe sync client (JEV-002A).

The adapter always sends the shared moderation questions over the caller's
normalized state and converts SDK errors into stable
`ModerationUnavailable` codes so policy composition code never touches the
SDK directly. The client is injectable for offline tests.
"""
from typing import NamedTuple

from typesafe_sdk import (
    TypeSafeAPIConnectionError,
    TypeSafeAPIError,
    TypeSafeAPIResponseValidationError,
    TypeSafeAPITimeoutError,
    TypeSafeClient,
    TypeSafeRateLimitError,
    TypeSafeError,
)

from .errors import ModerationUnavailable
from .questions import MODERATION_QUESTIONS


class ModerationJudgment(NamedTuple):
    """Typed, JSON-serializable moderation answers."""

    model: str
    nouls: dict[str, float]


class JevModerationClient:
    """Adapter for `TypeSafeClient.system_one` with shared moderation questions."""

    default_client_factory = TypeSafeClient

    def __init__(self, *, client=None, client_factory=None, model: str | None = None) -> None:
        self._client = client
        self._client_factory = client_factory or self.default_client_factory
        self._model = model

    def classify(self, state: dict) -> ModerationJudgment:
        client = self._resolve_client()
        try:
            response = client.system_one(state, MODERATION_QUESTIONS, model=self._model)
        except TypeSafeRateLimitError as error:
            raise ModerationUnavailable(
                "typesafe_rate_limited", retry_after_ms=error.retry_after_ms
            ) from error
        except TypeSafeAPITimeoutError as error:
            raise ModerationUnavailable("typesafe_timeout") from error
        except TypeSafeAPIConnectionError as error:
            raise ModerationUnavailable("typesafe_connection") from error
        except TypeSafeAPIResponseValidationError as error:
            raise ModerationUnavailable("typesafe_response_invalid") from error
        except TypeSafeAPIError as error:
            raise ModerationUnavailable("typesafe_api_error") from error
        return self._to_judgment(response)

    def _resolve_client(self):
        if self._client is None:
            try:
                self._client = self._client_factory()
            except TypeSafeError as error:
                raise ModerationUnavailable("typesafe_config") from error
        return self._client

    @staticmethod
    def _to_judgment(response) -> ModerationJudgment:
        nouls = {name: answer.noul for name, answer in response.nouls.items()}
        missing = set(MODERATION_QUESTIONS) - set(nouls)
        if missing:
            raise ModerationUnavailable(
                "typesafe_response_invalid",
                detail=f"missing typed answers for {sorted(missing)}",
            )
        return ModerationJudgment(model=response.model, nouls=nouls)
