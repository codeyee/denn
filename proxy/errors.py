from typing import Dict, Any, Optional
from dataclasses import dataclass
from rest_framework import status

@dataclass(frozen=True)
class ErrorCode:
    code: str
    message: str
    http_status: int

TIMEOUT = ErrorCode(
    code='TIMEOUT',
    message='Request to external API timed out',
    http_status=status.HTTP_504_GATEWAY_TIMEOUT
)

CONNECTION_ERROR = ErrorCode(
    code='CONNECTION_ERROR',
    message='Failed to connect to external API',
    http_status=status.HTTP_503_SERVICE_UNAVAILABLE
)

RESPONSE_NOT_JSON = ErrorCode(
    code='RESPONSE_NOT_JSON',
    message='External API returned non-JSON response',
    http_status=status.HTTP_502_BAD_GATEWAY
)

INTERNAL_SERVER_ERROR = ErrorCode(
    code='INTERNAL_SERVER_ERROR',
    message='An unexpected error occurred',
    http_status=status.HTTP_500_INTERNAL_SERVER_ERROR
)

MISSING_QUERY = ErrorCode(
    code='MISSING_QUERY',
    message='Query parameter is required',
    http_status=status.HTTP_400_BAD_REQUEST
)

MISSING_PARAMETER = ErrorCode(
    code='MISSING_PARAMETER',
    message='Required parameter is missing',
    http_status=status.HTTP_400_BAD_REQUEST
)

INVALID_PARAMETER = ErrorCode(
    code='INVALID_PARAMETER',
    message='Parameter value is invalid',
    http_status=status.HTTP_400_BAD_REQUEST
)

RESOURCE_NOT_FOUND = ErrorCode(
    code='RESOURCE_NOT_FOUND',
    message='Requested resource was not found',
    http_status=status.HTTP_404_NOT_FOUND
)

UNAUTHORIZED = ErrorCode(
    code='UNAUTHORIZED',
    message='Authentication credentials are invalid or missing',
    http_status=status.HTTP_401_UNAUTHORIZED
)

FORBIDDEN = ErrorCode(
    code='FORBIDDEN',
    message='You do not have permission to access this resource',
    http_status=status.HTTP_403_FORBIDDEN
)

RATE_LIMIT_EXCEEDED = ErrorCode(
    code='RATE_LIMIT_EXCEEDED',
    message='API rate limit exceeded',
    http_status=status.HTTP_429_TOO_MANY_REQUESTS
)

def build_error_response(
    error_code: ErrorCode,
    custom_message: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    response = {
        'error': error_code.code,
        'message': custom_message or error_code.message
    }
    if details: response['details'] = details
    return response

def get_http_status(error_code: ErrorCode) -> int:
    return error_code.http_status

def build_error_response_data(error: str, message: str) -> Dict[str, Any]:
    return {'error': error, 'message': message}
