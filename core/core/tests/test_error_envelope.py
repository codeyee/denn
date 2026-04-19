"""Contract test for the canonical error envelope.

Locks the shape shared with the Go `proxy` (see
.docs/contracts/internal-http.md and proxy/internal/handlers/common/response_test.go).

Envelope:

    {
        "error":      "MACHINE_CODE",
        "message":    "Human readable",
        "fields":     {...},          # optional
        "request_id": "uuid",          # added when middleware ran
        ...extra
    }
"""
from django.test import SimpleTestCase
from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.test import APIRequestFactory
from rest_framework.views import APIView

from core.error_codes import ErrorCode
from core.exceptions import APIError, custom_exception_handler


class _DummyView(APIView):
    pass


def _context():
    factory = APIRequestFactory()
    return {
        'view': _DummyView(),
        'request': factory.get('/'),
    }


class ErrorEnvelopeContractTests(SimpleTestCase):
    def test_api_error_envelope_shape(self):
        err = APIError(ErrorCode.RESOURCE_NOT_FOUND, custom_message='gone')
        response = err.to_response()

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(response.data['error'], 'RESOURCE_NOT_FOUND')
        self.assertEqual(response.data['message'], 'gone')
        self.assertNotIn('code', response.data, "legacy 'code' key must not appear")

    def test_api_error_with_extra_data(self):
        err = APIError(
            ErrorCode.DUPLICATE_ITEM,
            extra_data={'existing_item_id': 7},
        )
        response = err.to_response()
        self.assertEqual(response.data['error'], 'DUPLICATE_ITEM')
        self.assertEqual(response.data['existing_item_id'], 7)

    def test_drf_validation_error_through_handler(self):
        exc = ValidationError({'name': ['This field is required.']})
        response = custom_exception_handler(exc, _context())

        self.assertIsNotNone(response)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data['error'], 'VALIDATION_ERROR')
        self.assertEqual(response.data['fields'], {'name': ['This field is required.']})

    def test_handler_returns_none_for_unknown_exception(self):
        response = custom_exception_handler(RuntimeError('boom'), _context())
        self.assertIsNone(response)
