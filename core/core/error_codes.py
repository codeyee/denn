from dataclasses import dataclass
from rest_framework import status


@dataclass(frozen=True)
class ErrorCodeData:
    code: str
    message: str
    http_status: int


class ErrorCode:
    TIMEOUT = ErrorCodeData(
        code='TIMEOUT',
        message='Request to external API timed out',
        http_status=status.HTTP_504_GATEWAY_TIMEOUT
    )

    CONNECTION_ERROR = ErrorCodeData(
        code='CONNECTION_ERROR',
        message='Failed to connect to external API',
        http_status=status.HTTP_503_SERVICE_UNAVAILABLE
    )

    RESPONSE_NOT_JSON = ErrorCodeData(
        code='RESPONSE_NOT_JSON',
        message='External API returned non-JSON response',
        http_status=status.HTTP_502_BAD_GATEWAY
    )

    INTERNAL_SERVER_ERROR = ErrorCodeData(
        code='INTERNAL_SERVER_ERROR',
        message='An unexpected error occurred',
        http_status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )

    MISSING_QUERY = ErrorCodeData(
        code='MISSING_QUERY',
        message='Query parameter is required',
        http_status=status.HTTP_400_BAD_REQUEST
    )

    MISSING_PARAMETER = ErrorCodeData(
        code='MISSING_PARAMETER',
        message='Required parameter is missing',
        http_status=status.HTTP_400_BAD_REQUEST
    )

    INVALID_PARAMETER = ErrorCodeData(
        code='INVALID_PARAMETER',
        message='Parameter value is invalid',
        http_status=status.HTTP_400_BAD_REQUEST
    )

    RESOURCE_NOT_FOUND = ErrorCodeData(
        code='RESOURCE_NOT_FOUND',
        message='Requested resource was not found',
        http_status=status.HTTP_404_NOT_FOUND
    )

    UNAUTHORIZED = ErrorCodeData(
        code='UNAUTHORIZED',
        message='Authentication credentials are invalid or missing',
        http_status=status.HTTP_401_UNAUTHORIZED
    )

    FORBIDDEN = ErrorCodeData(
        code='FORBIDDEN',
        message='You do not have permission to access this resource',
        http_status=status.HTTP_403_FORBIDDEN
    )

    RATE_LIMIT_EXCEEDED = ErrorCodeData(
        code='RATE_LIMIT_EXCEEDED',
        message='API rate limit exceeded',
        http_status=status.HTTP_429_TOO_MANY_REQUESTS
    )

    DUPLICATE_ITEM = ErrorCodeData(
        code='DUPLICATE_ITEM',
        message='This item is already in the list',
        http_status=status.HTTP_400_BAD_REQUEST
    )

    FAVORITE_LIMIT_REACHED = ErrorCodeData(
        code='FAVORITE_LIMIT_REACHED',
        message='You can only favorite five completed items of each content type',
        http_status=status.HTTP_409_CONFLICT,
    )

    TRACKING_PARENT_MISSING = ErrorCodeData(
        code='TRACKING_PARENT_MISSING',
        message='The season is missing its local TV show relationship',
        http_status=status.HTTP_409_CONFLICT,
    )

    TRACKING_NOT_COMPLETED = ErrorCodeData(
        code='TRACKING_NOT_COMPLETED',
        message='Only completed content can be marked as a favorite',
        http_status=status.HTTP_409_CONFLICT,
    )
