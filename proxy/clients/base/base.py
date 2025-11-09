import requests
from typing import Dict, Any, Optional, Tuple
from proxy.exceptions import (
    TimeoutException,
    ConnectionErrorException,
    ResponseNotJsonException,
    InternalServerException
)

DEFAULT_API_TIMEOUT = 30


class BaseAPIClient:
    def __init__(self, base_url: str, api_name: str = None):
        self.base_url = base_url.rstrip('/')
        self.api_name = api_name
        self.timeout = DEFAULT_API_TIMEOUT

    def _get_timeout(self, operation: str = 'default') -> int:
        return self.timeout

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
        headers: Optional[Dict[str, str]] = None,
        operation: str = 'default'
    ) -> Tuple[Dict[str, Any], int]:
        url = self.build_url(endpoint)
        final_headers = self.get_headers()
        if headers:
            final_headers.update(headers)

        try:
            timeout = self._get_timeout(operation)
            response = requests.request(
                method=method,
                url=url,
                headers=final_headers,
                params=params,
                json=data,
                timeout=timeout
            )

            try:
                response_data = response.json()
            except ValueError:
                raise ResponseNotJsonException(
                    f'Non-JSON response: {response.text}')

            return response_data, response.status_code

        except requests.exceptions.Timeout:
            raise TimeoutException()

        except requests.exceptions.ConnectionError:
            raise ConnectionErrorException()

        except (TimeoutException, ConnectionErrorException, ResponseNotJsonException):
            raise

        except Exception as e:
            raise InternalServerException(custom_message=str(e))

    def get(self, endpoint: str, params: Optional[Dict[str, Any]] = None, operation: str = 'default') -> Tuple[Dict[str, Any], int]:
        return self.request('GET', endpoint, params=params, operation=operation)

    def post(self, endpoint: str, data: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None, operation: str = 'default') -> Tuple[Dict[str, Any], int]:
        return self.request('POST', endpoint, params=params, data=data, operation=operation)

    def put(self, endpoint: str, data: Optional[Dict[str, Any]] = None, params: Optional[Dict[str, Any]] = None, operation: str = 'default') -> Tuple[Dict[str, Any], int]:
        return self.request('PUT', endpoint, params=params, data=data, operation=operation)

    def delete(self, endpoint: str, params: Optional[Dict[str, Any]] = None, operation: str = 'default') -> Tuple[Dict[str, Any], int]:
        return self.request('DELETE', endpoint, params=params, operation=operation)
