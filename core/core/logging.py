"""JSON log formatter and Django LOGGING dict.

Pure stdlib — no extra dependency. The shape mirrors the Go ``proxy``
slog handler so logs from both services aggregate cleanly:

    {"ts": "...", "level": "INFO", "logger": "...", "msg": "...",
     "request_id": "...", "method": "...", ...}
"""
from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from typing import Any

from core.middleware.request_id import get_current_request_id

# Reserved attributes on logging.LogRecord that we serialize manually
# (everything else is treated as structured "extra").
_RESERVED_ATTRS = {
    "args", "asctime", "created", "exc_info", "exc_text", "filename",
    "funcName", "levelname", "levelno", "lineno", "message", "module",
    "msecs", "msg", "name", "pathname", "process", "processName",
    "relativeCreated", "stack_info", "thread", "threadName",
    "taskName",
}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:  # noqa: D401
        payload: dict[str, Any] = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }

        request_id = get_current_request_id()
        if request_id:
            payload["request_id"] = request_id

        for key, value in record.__dict__.items():
            if key in _RESERVED_ATTRS or key.startswith("_"):
                continue
            payload[key] = _safe(value)

        if record.exc_info:
            payload["exc_info"] = self.formatException(record.exc_info)

        return json.dumps(payload, default=str)


def _safe(value: Any) -> Any:
    """Best-effort JSON-safe coercion for non-trivial extra fields."""
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    if isinstance(value, (list, tuple)):
        return [_safe(v) for v in value]
    if isinstance(value, dict):
        return {str(k): _safe(v) for k, v in value.items()}
    return str(value)


def build_logging_config(*, level: str = "INFO") -> dict[str, Any]:
    """Return the Django LOGGING dict.

    Kept as a function (not a module-level constant) so settings/base.py
    can override the level from env vars without import-order pitfalls.
    """
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "json": {
                "()": "core.logging.JsonFormatter",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "json",
            },
        },
        "root": {
            "handlers": ["console"],
            "level": level,
        },
        "loggers": {
            "django": {"handlers": ["console"], "level": level, "propagate": False},
            "django.request": {
                "handlers": ["console"],
                "level": "WARNING",
                "propagate": False,
            },
            "django.server": {
                "handlers": ["console"],
                "level": "WARNING",
                "propagate": False,
            },
            "core": {"handlers": ["console"], "level": level, "propagate": False},
            "content": {"handlers": ["console"], "level": level, "propagate": False},
            "authentication": {
                "handlers": ["console"],
                "level": level,
                "propagate": False,
            },
        },
    }
