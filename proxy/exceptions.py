from rest_framework.response import Response
from rest_framework import status as http_status
from proxy.errors import ErrorCode, RESOURCE_NOT_FOUND, INVALID_PARAMETER, MISSING_PARAMETER


class APIError(Exception):
    def __init__(self, error_code: ErrorCode, custom_message: str = None):
        self.error_code = error_code
        self.message = custom_message or error_code.message
        super().__init__(self.message)

    def to_response(self) -> Response:
        return Response(
            {
                'error': self.error_code.code,
                'message': self.message
            },
            status=self.error_code.http_status
        )


class NotFoundError(APIError):
    def __init__(self, resource_type: str = 'Resource'):
        super().__init__(RESOURCE_NOT_FOUND, f'{resource_type} not found')


class InvalidParameterError(APIError):
    def __init__(self, message: str):
        super().__init__(INVALID_PARAMETER, message)


class MissingParameterError(APIError):
    def __init__(self, parameter_name: str):
        super().__init__(MISSING_PARAMETER, f'Missing required parameter: {parameter_name}')

