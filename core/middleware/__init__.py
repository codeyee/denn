"""Cross-cutting Django middleware for the `core` service.

See docs/contracts/internal-http.md for the canonical request flow.
"""
from .access_log import AccessLogMiddleware  # noqa: F401
from .perf_timing import (  # noqa: F401
    PerfTimingMiddleware,
    get_request_perf_metrics,
    perf_record_proxy_call,
)
from .request_id import RequestIdMiddleware, get_current_request_id  # noqa: F401
