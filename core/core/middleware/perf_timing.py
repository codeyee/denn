"""Per-request performance timing and data-source middleware.

Captures bounded signals per request and stashes them on the request
object so :class:`AccessLogMiddleware` can include them in the existing
``http_request`` log line:

- ``query_count``  total ORM queries executed
- ``db_time_ms``   wall time spent inside the DB driver
- ``proxy_time_ms`` wall time spent calling the Go proxy
- ``proxy_calls``  number of proxy HTTP calls
- ``data_fresh`` / ``data_stale`` / ``data_missing`` local data states
- ``provider_fetches`` source rows that required proxy/provider work

Activation
----------
Gated behind ``PERF_LOGGING_ENABLED=true`` (env var, evaluated per
request — no redeploy required to flip the flag because we re-read
``os.environ`` lazily on the first request after import). When off the
middleware short-circuits to ``self.get_response(request)`` so the
overhead is one attribute lookup plus one boolean check.

Implementation notes
--------------------
- DB metrics: we toggle ``connection.force_debug_cursor`` on every open
  connection so ``connection.queries`` populates regardless of
  ``DEBUG``. Restored in ``finally``. This is the same trick
  ``django.test.utils.CaptureQueriesContext`` uses; safe in
  thread-per-request setups.
- Proxy metrics: the proxy client increments thread-local counters
  initialised here. If the counters are missing (code path outside a
  request, e.g. management commands) the proxy client's helper is a
  no-op.
- Threading model: Django runs one request per thread by default, so
  ``threading.local`` is correct. If we ever switch to ASGI/async
  workers, swap ``_perf_local`` for ``contextvars.ContextVar``.

The middleware MUST be installed AFTER ``AccessLogMiddleware`` in
``MIDDLEWARE`` so it sits *inside* the access-log scope: it captures the
view's work and then ``AccessLogMiddleware`` reads
``request._perf_metrics`` while building the log record.
"""
from __future__ import annotations

import os
import threading
from typing import Any, Callable, Optional

from django.db import connections
from django.http import HttpRequest, HttpResponse

_perf_local = threading.local()


def _is_enabled() -> bool:
    return os.getenv("PERF_LOGGING_ENABLED", "false").lower() == "true"


def perf_start_request() -> None:
    """Initialise per-request proxy counters in the thread-local store."""
    _perf_local.proxy_calls = 0
    _perf_local.proxy_time_ms = 0.0
    _perf_local.data_fresh = 0
    _perf_local.data_stale = 0
    _perf_local.data_missing = 0
    _perf_local.provider_fetches = 0
    _perf_local.active = True


def perf_end_request() -> dict[str, Any]:
    """Snapshot and clear per-request proxy counters."""
    metrics = {
        "proxy_calls": getattr(_perf_local, "proxy_calls", 0),
        "proxy_time_ms": round(getattr(_perf_local, "proxy_time_ms", 0.0), 2),
        "data_fresh": getattr(_perf_local, "data_fresh", 0),
        "data_stale": getattr(_perf_local, "data_stale", 0),
        "data_missing": getattr(_perf_local, "data_missing", 0),
        "provider_fetches": getattr(_perf_local, "provider_fetches", 0),
    }
    _perf_local.active = False
    _perf_local.proxy_calls = 0
    _perf_local.proxy_time_ms = 0.0
    _perf_local.data_fresh = 0
    _perf_local.data_stale = 0
    _perf_local.data_missing = 0
    _perf_local.provider_fetches = 0
    return metrics


def perf_record_proxy_call(duration_seconds: float) -> None:
    """Record one proxy HTTP call. No-op if no request is active."""
    perf_record_proxy_batch(1, duration_seconds)


def perf_record_proxy_batch(call_count: int, duration_seconds: float) -> None:
    """Record a parallel proxy batch on the owning request thread."""
    if not getattr(_perf_local, "active", False):
        return
    _perf_local.proxy_calls = (
        getattr(_perf_local, "proxy_calls", 0) + max(call_count, 0)
    )
    _perf_local.proxy_time_ms = (
        getattr(_perf_local, "proxy_time_ms", 0.0) + duration_seconds * 1000.0
    )


def perf_record_data_source(
    *,
    fresh: int,
    stale: int,
    missing: int,
    provider_fetches: int,
) -> None:
    """Record bounded local-first source-data counters for this request."""
    if not getattr(_perf_local, "active", False):
        return
    _perf_local.data_fresh += max(fresh, 0)
    _perf_local.data_stale += max(stale, 0)
    _perf_local.data_missing += max(missing, 0)
    _perf_local.provider_fetches += max(provider_fetches, 0)


class PerfTimingMiddleware:
    """Capture DB + proxy timing per request when PERF_LOGGING_ENABLED.

    Stash the result on ``request._perf_metrics``. ``AccessLogMiddleware``
    merges it into the ``http_request`` log line.
    """

    def __init__(self, get_response: Callable[[HttpRequest], HttpResponse]) -> None:
        self.get_response = get_response

    def __call__(self, request: HttpRequest) -> HttpResponse:
        if not _is_enabled():
            return self.get_response(request)

        prior_force_debug: dict[str, bool] = {}
        prior_query_lengths: dict[str, int] = {}
        for alias in connections:
            conn = connections[alias]
            prior_force_debug[alias] = conn.force_debug_cursor
            conn.force_debug_cursor = True
            prior_query_lengths[alias] = len(conn.queries_log)

        perf_start_request()
        try:
            response = self.get_response(request)
        finally:
            query_count = 0
            db_time_ms = 0.0
            for alias in connections:
                conn = connections[alias]
                queries = list(conn.queries_log)[prior_query_lengths.get(alias, 0):]
                query_count += len(queries)
                for q in queries:
                    try:
                        db_time_ms += float(q.get("time", 0.0)) * 1000.0
                    except (TypeError, ValueError):
                        continue
                conn.force_debug_cursor = prior_force_debug.get(alias, False)

            proxy_metrics = perf_end_request()

            request._perf_metrics = {  # type: ignore[attr-defined]
                "query_count": query_count,
                "db_time_ms": round(db_time_ms, 2),
                "proxy_calls": proxy_metrics["proxy_calls"],
                "proxy_time_ms": proxy_metrics["proxy_time_ms"],
                "data_fresh": proxy_metrics["data_fresh"],
                "data_stale": proxy_metrics["data_stale"],
                "data_missing": proxy_metrics["data_missing"],
                "provider_fetches": proxy_metrics["provider_fetches"],
            }

        return response


def get_request_perf_metrics(request: HttpRequest) -> Optional[dict[str, Any]]:
    """Return the captured perf metrics for a request, if any."""
    return getattr(request, "_perf_metrics", None)


__all__ = [
    "PerfTimingMiddleware",
    "perf_record_proxy_batch",
    "perf_record_proxy_call",
    "perf_record_data_source",
    "get_request_perf_metrics",
]
