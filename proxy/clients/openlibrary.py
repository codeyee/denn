from proxy.clients.base import BaseAPIClient
from django.conf import settings
from typing import Dict, Any, Tuple


class OpenLibraryClient(BaseAPIClient):
    def __init__(self):
        config = settings.PROXY_API['OPENLIBRARY']
        super().__init__(base_url=config['BASE_URL'])
        self.covers_base_url = config['COVERS_BASE_URL']
        self.user_agent = config['USER_AGENT']

    def get_headers(self) -> Dict[str, str]:
        headers = super().get_default_headers()
        headers['User-Agent'] = self.user_agent
        return headers

    def search(self, query: str, page: int = 1, limit: int = 50) -> Tuple[Dict[str, Any], int]:
        endpoint = 'search.json'
        offset = (page - 1) * limit
        params = {
            'q': query,
            'limit': limit,
            'offset': offset,
            'fields': '*'
        }
        return self.get(endpoint, params=params)

