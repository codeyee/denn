"""One-line-per-request access log.

Emits a structured ``http_request`` record after every response,
including ``request_id``, ``status``, ``duration_ms`` and a bounded
authenticated boolean. Pair with RequestIdMiddleware so the line shares
a correlation key with the proxy and the BFF.
"""
from __future__ import annotations

import logging
import time
from typing import Callable

from django.http import HttpRequest, HttpResponse

from .perf_timing import get_request_perf_metrics

logger = logging.getLogger("core.access")


class AccessLogMiddleware:
    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        start = time.perf_counter()
        response = self.get_response(request)
        duration_ms = int((time.perf_counter() - start) * 1000)

        user = getattr(request, "user", None)
        authenticated = bool(
            user is not None and getattr(user, "is_authenticated", False)
        )

        extra = {
            "method": request.method,
            "path": _route_template(request),
            "status": response.status_code,
            "duration_ms": duration_ms,
            "authenticated": authenticated,
            "payload_size_bytes": _response_size(response),
        }

        perf_metrics = get_request_perf_metrics(request)
        if perf_metrics is not None:
            extra.update(perf_metrics)
            response["Server-Timing"] = (
                f'app;dur={duration_ms}, '
                f'db;dur={perf_metrics["db_time_ms"]}, '
                f'proxy;dur={perf_metrics["proxy_time_ms"]}'
            )

        if response.status_code >= 500:
            logger.error("http_request", extra=extra)
        elif response.status_code >= 400:
            logger.warning("http_request", extra=extra)
        else:
            logger.info("http_request", extra=extra)

        return response


def _response_size(response: HttpResponse) -> int:
    content_length = response.get("Content-Length")
    if content_length:
        try:
            return max(int(content_length), 0)
        except ValueError:
            pass
    if getattr(response, "streaming", False):
        return 0
    return len(response.content)


def _route_template(request: HttpRequest) -> str:
    resolver_match = getattr(request, "resolver_match", None)
    route = getattr(resolver_match, "route", None)
    if not isinstance(route, str) or not route:
        return "/unmatched"
    return f"/{route.lstrip('/')}"
