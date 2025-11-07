from rest_framework.views import exception_handler
from rest_framework.response import Response
from proxy.exceptions import APIError


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
