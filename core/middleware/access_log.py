"""One-line-per-request access log.

Emits a structured ``http_request`` record after every response,
including ``request_id``, ``status``, ``duration_ms`` and ``user_id``
(when authenticated). Pair with RequestIdMiddleware so the line shares a
correlation key with the proxy and the BFF.
"""
from __future__ import annotations

import logging
import time
from typing import Callable

from django.http import HttpRequest, HttpResponse

logger = logging.getLogger("core.access")


class AccessLogMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        start = time.perf_counter()
        response = self.get_response(request)
        duration_ms = int((time.perf_counter() - start) * 1000)

        user_id = None
        user = getattr(request, "user", None)
        if user is not None and getattr(user, "is_authenticated", False):
            user_id = user.pk

        extra = {
            "method": request.method,
            "path": request.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
            "user_id": user_id,
        }

        if response.status_code >= 500:
            logger.error("http_request", extra=extra)
        elif response.status_code >= 400:
            logger.warning("http_request", extra=extra)
        else:
            logger.info("http_request", extra=extra)

        return response
