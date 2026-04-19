"""Tests for core.middleware.request_id."""
from django.http import HttpResponse
from django.test import RequestFactory, SimpleTestCase

from core.middleware.request_id import (
    REQUEST_ID_HEADER,
    RequestIdMiddleware,
    get_current_request_id,
)


def _ok(request):
    return HttpResponse("ok")


class RequestIdMiddlewareTests(SimpleTestCase):
    def setUp(self):
        self.factory = RequestFactory()
        self.middleware = RequestIdMiddleware(_ok)

    def test_generates_when_missing(self):
        request = self.factory.get("/")
        response = self.middleware(request)

        self.assertTrue(getattr(request, "request_id", None))
        self.assertEqual(response[REQUEST_ID_HEADER], request.request_id)

    def test_preserves_incoming(self):
        request = self.factory.get("/", HTTP_X_REQUEST_ID="abc-123")
        response = self.middleware(request)

        self.assertEqual(request.request_id, "abc-123")
        self.assertEqual(response[REQUEST_ID_HEADER], "abc-123")

    def test_thread_local_is_cleared_after_response(self):
        request = self.factory.get("/")
        self.middleware(request)
        self.assertIsNone(get_current_request_id())

    def test_blank_incoming_treated_as_missing(self):
        request = self.factory.get("/", HTTP_X_REQUEST_ID="   ")
        response = self.middleware(request)

        self.assertNotEqual(request.request_id, "")
        self.assertNotEqual(request.request_id, "   ")
        self.assertEqual(response[REQUEST_ID_HEADER], request.request_id)
