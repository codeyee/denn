"""Canonical error envelope for `core`.

Contract (shared with `proxy`, see `docs/contracts/internal-http.md`):

    {
        "error":      "MACHINE_CODE",     # required, stable identifier
        "message":    "Human readable",   # required
        "fields":     { "name": ["msg"] }, # optional, validation only
        "request_id": "uuid",              # added by RequestIdMiddleware
        ...extra_data                      # optional, error-specific
    }
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status as http_status

from core.error_codes import ErrorCode, ErrorCodeData


def _current_request_id() -> str:
    """Return the request_id set by RequestIdMiddleware (PR-6C), or ''."""
    try:
        from core.middleware.request_id import get_current_request_id
        return get_current_request_id() or ''
    except Exception:
        return ''


class APIError(Exception):
    def __init__(self, error_code: ErrorCodeData, custom_message: str = None, extra_data: dict = None):
        self.error_code = error_code
        self.message = custom_message or error_code.message
        self.extra_data = extra_data or {}
        super().__init__(self.message)

    def to_response(self) -> Response:
        response_data = {
            'error': self.error_code.code,
            'message': self.message,
            **self.extra_data,
        }
        request_id = _current_request_id()
        if request_id:
            response_data['request_id'] = request_id

        return Response(response_data, status=self.error_code.http_status)


class NotFoundException(APIError):
    def __init__(self, resource_type: str = 'Resource'):
        super().__init__(
            ErrorCode.RESOURCE_NOT_FOUND,
            custom_message=f'{resource_type} not found'
        )


class InvalidParameterException(APIError):
    def __init__(self, message: str):
        super().__init__(
            ErrorCode.INVALID_PARAMETER,
            custom_message=message
        )


class MissingParameterException(APIError):
    def __init__(self, parameter_name: str):
        super().__init__(
            ErrorCode.MISSING_PARAMETER,
            custom_message=f'Missing required parameter: {parameter_name}'
        )


class TimeoutException(APIError):
    def __init__(self, custom_message: str = None):
        super().__init__(
            ErrorCode.TIMEOUT,
            custom_message=custom_message
        )


class ConnectionErrorException(APIError):
    def __init__(self, custom_message: str = None):
        super().__init__(
            ErrorCode.CONNECTION_ERROR,
            custom_message=custom_message
        )


class ResponseNotJsonException(APIError):
    def __init__(self, custom_message: str = None):
        super().__init__(
            ErrorCode.RESPONSE_NOT_JSON,
            custom_message=custom_message
        )


class InternalServerException(APIError):
    def __init__(self, custom_message: str = None):
        super().__init__(
            ErrorCode.INTERNAL_SERVER_ERROR,
            custom_message=custom_message
        )


class UnauthorizedException(APIError):
    def __init__(self, custom_message: str = None):
        super().__init__(
            ErrorCode.UNAUTHORIZED,
            custom_message=custom_message
        )


class ForbiddenException(APIError):
    def __init__(self, custom_message: str = None):
        super().__init__(
            ErrorCode.FORBIDDEN,
            custom_message=custom_message
        )


class RateLimitExceededException(APIError):
    def __init__(self, custom_message: str = None):
        super().__init__(
            ErrorCode.RATE_LIMIT_EXCEEDED,
            custom_message=custom_message
        )


class DuplicateItemException(APIError):
    def __init__(self, existing_item_id: int, existing_item: dict):
        super().__init__(
            ErrorCode.DUPLICATE_ITEM,
            extra_data={
                'existing_item_id': existing_item_id,
                'existing_item': existing_item
            }
        )


def custom_exception_handler(exc, context):
    if isinstance(exc, APIError):
        return exc.to_response()

    response = exception_handler(exc, context)
    if response is None:
        return None

    request_id = _current_request_id()

    if isinstance(response.data, dict):
        envelope = {
            'error': _error_code_from_status(response.status_code),
            'message': _extract_message(response.data),
            'fields': _extract_field_errors(response.data),
        }
    elif isinstance(response.data, list):
        envelope = {
            'error': _error_code_from_status(response.status_code),
            'message': response.data[0] if response.data else 'An error occurred',
            'fields': {},
        }
    else:
        envelope = {
            'error': _error_code_from_status(response.status_code),
            'message': str(response.data),
            'fields': {},
        }

    if request_id:
        envelope['request_id'] = request_id

    response.data = envelope
    return response


_STATUS_TO_CODE = {
    400: 'VALIDATION_ERROR',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    405: 'METHOD_NOT_ALLOWED',
    429: 'RATE_LIMITED',
}


def _error_code_from_status(status_code: int) -> str:
    return _STATUS_TO_CODE.get(status_code, 'ERROR')


def _extract_message(data: dict) -> str:
    if 'detail' in data:
        detail = data['detail']
        return str(detail)
    for value in data.values():
        if isinstance(value, list) and value:
            return str(value[0])
        if isinstance(value, str):
            return value
    return 'An error occurred'


def _extract_field_errors(data: dict) -> dict:
    if 'detail' in data and len(data) == 1:
        return {}
    fields = {}
    for key, value in data.items():
        if key == 'detail':
            continue
        if isinstance(value, list):
            fields[key] = [str(v) for v in value]
        elif isinstance(value, dict):
            fields[key] = value
        else:
            fields[key] = [str(value)]
    return fields
