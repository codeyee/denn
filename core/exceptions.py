from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status as http_status
from core.error_codes import ErrorCode, ErrorCodeData


class APIError(Exception):
    def __init__(self, error_code: ErrorCodeData, custom_message: str = None):
        self.error_code = error_code
        self.message = custom_message or error_code.message
        super().__init__(self.message)

    def to_response(self) -> Response:
        response_data = {
            'error': self.error_code.code,
            'message': self.message
        }

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


def custom_exception_handler(exc, context):
    if isinstance(exc, APIError):
        return exc.to_response()

    response = exception_handler(exc, context)

    if response is not None:
        custom_response_data = {
            'error': 'ERROR',
            'message': str(exc) if str(exc) else 'An error occurred'
        }
        response.data = custom_response_data

    return response
