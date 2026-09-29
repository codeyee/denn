"""Narrow adapter over the TypeSafe sync client (JEV-002A).

The adapter always sends the shared moderation questions over the caller's
normalized state and converts SDK errors into stable
`ModerationUnavailable` codes so policy composition code never touches the
SDK directly. The client and the settings access are injectable for offline
tests, and `MODERATION_CLASSIFICATION_ENABLED` is honored before any client
factory resolution or construction.
"""
from typing import Literal, NamedTuple

from django.conf import settings
from typesafe_sdk import (
    TypeSafeAPIConnectionError,
    TypeSafeAPIError,
    TypeSafeAPIResponseValidationError,
    TypeSafeAPITimeoutError,
    TypeSafeClient,
    RetryPolicy,
    TypeSafeRateLimitError,
    TypeSafeError,
)

from .errors import ModerationError, ModerationSkipped, ModerationUnavailable
from .questions import MODERATION_QUESTIONS


class UsageTokens(NamedTuple):
    """Serializable token counts from the SDK response usage field."""

    input_tokens: int | None
    output_tokens: int | None


class ModerationJudgment(NamedTuple):
    """Typed, JSON-serializable moderation answers.

    `usage` preserves the SDK response usage as serializable input/output
    token fields. Latency is N/D: the installed SDK exposes no latency field,
    so none is invented here.
    """

    model: str
    nouls: dict[str, float]
    usage: UsageTokens


def _default_settings_getter(name: str):
    return getattr(settings, name)


def _default_client_factory():
    """Construct the production SDK client without automatic retries."""
    return TypeSafeClient(retry=RetryPolicy(max_retries=0))


class JevModerationClient:
    """Adapter for `TypeSafeClient.system_one` with shared moderation questions."""

    default_client_factory = staticmethod(_default_client_factory)

    def __init__(
        self,
        *,
        client=None,
        client_factory=None,
        model: str | None = None,
        settings_getter=None,
    ) -> None:
        self._client = client
        self._client_factory = client_factory or self.default_client_factory
        self._model = model
        self._settings_getter = settings_getter or _default_settings_getter

    def classify(self, state: dict) -> ModerationJudgment | ModerationSkipped:
        if not self._settings_getter("MODERATION_CLASSIFICATION_ENABLED"):
            return ModerationSkipped(code="moderation_disabled")
        client = self._resolve_client()
        model = self._model or self._settings_getter("MODERATION_MODEL")
        try:
            response = client.system_one(state, MODERATION_QUESTIONS, model=model)
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
        usage = response.usage
        return ModerationJudgment(
            model=response.model,
            nouls=nouls,
            usage=UsageTokens(
                input_tokens=getattr(usage, "input_tokens", None),
                output_tokens=getattr(usage, "output_tokens", None),
            ),
        )
