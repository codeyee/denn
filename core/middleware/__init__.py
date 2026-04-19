"""Cross-cutting Django middleware for the `core` service.

See docs/contracts/internal-http.md for the canonical request flow.
"""
from .access_log import AccessLogMiddleware  # noqa: F401
from .request_id import RequestIdMiddleware, get_current_request_id  # noqa: F401
