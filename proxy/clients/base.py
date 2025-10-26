import requests
from typing import Dict, Any, Optional, Tuple
from django.conf import settings
from proxy.errors import (
    build_error_response,
    get_http_status,
    TIMEOUT,
    CONNECTION_ERROR,
    RESPONSE_NOT_JSON,
    INTERNAL_SERVER_ERROR
)

class BaseAPIClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip('/')
        self.timeout = settings.REST_FRAMEWORK.get('TIMEOUT', 30)

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

        try:
            response = requests.request(
                method=method,
                url=url,
                headers=final_headers,
                params=params,
                json=data,
                timeout=self.timeout
            )

            try:
                response_data = response.json()
            except ValueError:
                response_data = build_error_response(
                    RESPONSE_NOT_JSON,
                    custom_message=f'Non-JSON response: {response.text}'
                )

            return response_data, response.status_code

        except requests.exceptions.Timeout:
            return build_error_response(TIMEOUT), get_http_status(TIMEOUT)

        except requests.exceptions.ConnectionError:
            return build_error_response(CONNECTION_ERROR), get_http_status(CONNECTION_ERROR)

        except Exception as e:
            return (
                build_error_response(INTERNAL_SERVER_ERROR, custom_message=str(e)),
                get_http_status(INTERNAL_SERVER_ERROR)
            )

    def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Tuple[Dict[str, Any], int]:
        return self.request('GET', endpoint, params=params)

    def post(self, endpoint: str, data: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None) -> Tuple[Dict[str, Any], int]:
        return self.request('POST', endpoint, params=params, data=data)

    def put(self, endpoint: str, data: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None) -> Tuple[Dict[str, Any], int]:
        return self.request('PUT', endpoint, params=params, data=data)

    def delete(self, endpoint: str, params: Optional[Dict[str, Any]] = None) -> Tuple[Dict[str, Any], int]:
        return self.request('DELETE', endpoint, params=params)
