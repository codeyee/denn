"""X-Request-Id middleware.

Reads the incoming `X-Request-Id` header (case-insensitive). If absent or
blank, generates a UUIDv4. The chosen ID is:

- attached to ``request.request_id`` for downstream views/services,
- exposed via :func:`get_current_request_id` for code that does not have
  the request object handy (e.g. exception handlers, log filters),
- echoed in the response header ``X-Request-Id``.

Install at the top of ``MIDDLEWARE`` so every request — including those
rejected by later middlewares — gets a correlation ID.
"""
from __future__ import annotations

import threading
import uuid
import re
from typing import Callable, Optional

from django.http import HttpRequest, HttpResponse

REQUEST_ID_HEADER = "X-Request-Id"
_META_KEY = "HTTP_X_REQUEST_ID"
_REQUEST_ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$")

_local = threading.local()


def get_current_request_id() -> Optional[str]:
    """Return the request ID for the in-flight request, or ``None``."""
    return getattr(_local, "request_id", None)


def _set_current_request_id(value: Optional[str]) -> None:
    if value is None:
        if hasattr(_local, "request_id"):
            del _local.request_id
        return
    _local.request_id = value


def normalize_request_id(value: str) -> Optional[str]:
    normalized = value.strip()
    return normalized if _REQUEST_ID_RE.fullmatch(normalized) else None


class RequestIdMiddleware:
    """Bind a stable request ID to every Django request/response cycle."""

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        incoming = normalize_request_id(request.META.get(_META_KEY, ""))
        request_id = incoming or uuid.uuid4().hex
        request.request_id = request_id  # type: ignore[attr-defined]
        _set_current_request_id(request_id)
        try:
            response = self.get_response(request)
        finally:
            _set_current_request_id(None)
        response[REQUEST_ID_HEADER] = request_id
        return response
