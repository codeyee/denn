"""Tests for core.middleware.perf_timing.

Validates the DB, proxy and local-first data-source signals captured
when the env flag is on, and that the middleware short-circuits when
off.
"""
from __future__ import annotations

import os
from unittest import mock

from django.contrib.auth.models import User
from django.http import HttpResponse
from django.test import RequestFactory, TestCase

from core.middleware.access_log import AccessLogMiddleware
from core.middleware.perf_timing import (
    PerfTimingMiddleware,
    get_request_perf_metrics,
    perf_record_data_source,
    perf_record_proxy_batch,
    perf_record_proxy_call,
)


def _ok(_request):
    return HttpResponse("ok")


def _hit_db(_request):
    User.objects.count()
    return HttpResponse("ok")


def _hit_proxy(_request):
    perf_record_proxy_batch(2, 0.035)
    perf_record_data_source(
        fresh=3,
        stale=1,
        missing=2,
        provider_fetches=3,
    )
    return HttpResponse("ok")


class PerfTimingMiddlewareDisabledTests(TestCase):
    """When PERF_LOGGING_ENABLED is unset/false the middleware is a no-op."""

    def setUp(self):
        self.factory = RequestFactory()

    @mock.patch.dict(os.environ, {"PERF_LOGGING_ENABLED": "false"}, clear=False)
    def test_no_metrics_attached(self):
        request = self.factory.get("/")
        PerfTimingMiddleware(_hit_db)(request)
        self.assertIsNone(get_request_perf_metrics(request))

    @mock.patch.dict(os.environ, {}, clear=False)
    def test_no_metrics_when_var_missing(self):
        os.environ.pop("PERF_LOGGING_ENABLED", None)
        request = self.factory.get("/")
        PerfTimingMiddleware(_hit_db)(request)
        self.assertIsNone(get_request_perf_metrics(request))


class PerfTimingMiddlewareEnabledTests(TestCase):
    """When PERF_LOGGING_ENABLED=true the bounded signals are captured."""

    def setUp(self):
        self.factory = RequestFactory()

    @mock.patch.dict(os.environ, {"PERF_LOGGING_ENABLED": "true"}, clear=False)
    def test_db_metrics_captured(self):
        request = self.factory.get("/")
        PerfTimingMiddleware(_hit_db)(request)

        metrics = get_request_perf_metrics(request)
        self.assertIsNotNone(metrics)
        self.assertGreaterEqual(metrics["query_count"], 1)
        self.assertGreaterEqual(metrics["db_time_ms"], 0.0)
        self.assertEqual(metrics["proxy_calls"], 0)
        self.assertEqual(metrics["proxy_time_ms"], 0.0)

    @mock.patch.dict(os.environ, {"PERF_LOGGING_ENABLED": "true"}, clear=False)
    def test_proxy_metrics_captured(self):
        request = self.factory.get("/")
        PerfTimingMiddleware(_hit_proxy)(request)

        metrics = get_request_perf_metrics(request)
        self.assertIsNotNone(metrics)
        self.assertEqual(metrics["proxy_calls"], 2)
        # The two-call parallel batch occupied a 35 ms wall-time window.
        self.assertGreaterEqual(metrics["proxy_time_ms"], 30.0)
        self.assertLessEqual(metrics["proxy_time_ms"], 50.0)
        self.assertEqual(metrics["data_fresh"], 3)
        self.assertEqual(metrics["data_stale"], 1)
        self.assertEqual(metrics["data_missing"], 2)
        self.assertEqual(metrics["provider_fetches"], 3)

    @mock.patch.dict(os.environ, {"PERF_LOGGING_ENABLED": "true"}, clear=False)
    def test_proxy_counter_isolated_between_requests(self):
        first = self.factory.get("/a")
        PerfTimingMiddleware(_hit_proxy)(first)

        second = self.factory.get("/b")
        PerfTimingMiddleware(_ok)(second)

        m1 = get_request_perf_metrics(first)
        m2 = get_request_perf_metrics(second)
        self.assertEqual(m1["proxy_calls"], 2)
        self.assertEqual(m2["proxy_calls"], 0)
        self.assertEqual(m2["proxy_time_ms"], 0.0)
        self.assertEqual(m2["data_fresh"], 0)
        self.assertEqual(m2["provider_fetches"], 0)

    @mock.patch.dict(os.environ, {"PERF_LOGGING_ENABLED": "true"}, clear=False)
    def test_record_proxy_outside_request_is_noop(self):
        # Calling without an active request must not raise.
        perf_record_proxy_call(0.123)


class AccessLogIntegrationTests(TestCase):
    """AccessLogMiddleware merges PerfTiming metrics into its log line."""

    def setUp(self):
        self.factory = RequestFactory()

    @mock.patch.dict(os.environ, {"PERF_LOGGING_ENABLED": "true"}, clear=False)
    def test_access_log_includes_perf_fields(self):
        # Outer = AccessLog, inner = PerfTiming, view = _hit_proxy.
        chain = AccessLogMiddleware(PerfTimingMiddleware(_hit_proxy))

        with self.assertLogs("core.access", level="INFO") as cm:
            chain(self.factory.get("/"))

        self.assertEqual(len(cm.records), 1)
        record = cm.records[0]
        self.assertEqual(record.proxy_calls, 2)
        self.assertGreaterEqual(record.proxy_time_ms, 30.0)
        self.assertGreaterEqual(record.query_count, 0)
        self.assertEqual(record.data_fresh, 3)
        self.assertEqual(record.provider_fetches, 3)
        self.assertEqual(record.payload_size_bytes, 2)
        self.assertFalse(record.authenticated)

    @mock.patch.dict(os.environ, {"PERF_LOGGING_ENABLED": "false"}, clear=False)
    def test_access_log_omits_perf_fields_when_disabled(self):
        chain = AccessLogMiddleware(PerfTimingMiddleware(_hit_proxy))

        with self.assertLogs("core.access", level="INFO") as cm:
            chain(self.factory.get("/"))

        record = cm.records[0]
        self.assertFalse(hasattr(record, "proxy_calls"))
        self.assertFalse(hasattr(record, "query_count"))
