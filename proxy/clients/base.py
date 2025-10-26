import requests
import logging
from typing import Dict, Any, Optional, Tuple
from rest_framework import status

logger = logging.getLogger(__name__)

class BaseAPIClient:
    def __init__(self, base_url: str, timeout: int = 30, headers: Optional[Dict[str, str]] = None):
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout

    def get_default_headers(self) -> Dict[str, str]:
        return {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }

    def get_headers(self) -> Dict[str, str]:
        return self.get_default_headers()

    def build_url(self, endpoint: str) -> str:
        endpoint = endpoint.lstrip('/')
        return f"{self.base_url}/{endpoint}"

    def build_error_response_data(self, error: str, message: str) -> Dict[str, Any]:
        return { 'error': error, 'message': message }

    def request(
        self,
        method: str,
        endpoint: str,
        params: Optional[Dict[str, Any]] = None,
        data: Optional[Dict[str, Any]] = None,
        headers: Optional[Dict[str, str]] = None
    ) -> Tuple[Dict[str, Any], int]:
        url = self.build_url(endpoint)

        final_headers = self.get_headers()
        if headers: final_headers.update(headers)

        logger.info(f"{method} {url}")
        logger.debug(f"Params: {params}")

        try:
            response = requests.request(
                method=method,
                url=url,
                headers=final_headers,
                params=params,
                json=data,
                timeout=self.timeout
            )

            logger.info(f"Response status: {response.status_code}")

            try:
                response_data = response.json()
            except ValueError:
                response_data = self.build_error_response_data('RESPONSE_NOT_JSON', response.text)

            return response_data, response.status_code

        except requests.exceptions.Timeout:
            logger.error("Request timeout")
            response_data = self.build_error_response_data('TIMEOUT', 'Request timeout')
            return response_data, status.HTTP_504_GATEWAY_TIMEOUT

        except requests.exceptions.ConnectionError:
            logger.error("Connection error")
            response_data = self.build_error_response_data('CONNECTION_ERROR', 'Connection error')
            return response_data, status.HTTP_503_SERVICE_UNAVAILABLE

        except Exception as e:
            logger.exception(f"Unexpected error: {str(e)}")
            response_data = self.build_error_response_data('INTERNAL_SERVER_ERROR', str(e))
            return response_data, status.HTTP_500_INTERNAL_SERVER_ERROR

    def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Tuple[Dict[str, Any], int]:
        return self.request('GET', endpoint, params=params)

    def post(self, endpoint: str, data: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None) -> Tuple[Dict[str, Any], int]:
        return self.request('POST', endpoint, params=params, data=data)

    def put(self, endpoint: str, data: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None) -> Tuple[Dict[str, Any], int]:
        return self.request('PUT', endpoint, params=params, data=data)

    def delete(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Tuple[Dict[str, Any], int]:
        return self.request('DELETE', endpoint, params=params)
