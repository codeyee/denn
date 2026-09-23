"""Moderation-domain exceptions and typed outcomes (JEV-002A)."""
from typing import NamedTuple


class ModerationError(Exception):
    """Base class for moderation workflow errors."""


class ModerationUnavailable(ModerationError):
    """A moderation request could not produce typed answers.

    The `code` field is stable and machine-readable, e.g. `typesafe_timeout`.
    `retry_after_ms` is set only for rate-limit failures.
    """

    def __init__(
        self,
        code: str,
        *,
        retry_after_ms: int | None = None,
        detail: str | None = None,
    ) -> None:
        super().__init__(code)
        self.code = code
        self.retry_after_ms = retry_after_ms
        self.detail = detail


class ModerationSkipped(NamedTuple):
    """Explicit typed outcome returned in disabled mode.

    No client is constructed and no call is made; `code` stays stable for
    persistence, e.g. `moderation_disabled`.
    """

    code: str
