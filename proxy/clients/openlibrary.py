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

    def get_book_by_key(self, book_key: str) -> Tuple[Dict[str, Any], int]:
        book_key = book_key.lstrip('/')
        endpoint = f'{book_key}.json'
        return self.get(endpoint)

    def search_by_key(self, key: str) -> Tuple[Dict[str, Any], int]:
        endpoint = 'search.json'
        params = {
            'q': key,
            'limit': 1,
            'fields': '*'
        }
        return self.get(endpoint, params=params)

    def get_bulk_books(self, book_keys: list[str]) -> Tuple[list[Dict[str, Any]], int]:
        results = []

        for book_key in book_keys:
            data, status_code = self.search_by_key(book_key)

            book_data = None
            if status_code == 200 and 'docs' in data and len(data['docs']) > 0:
                book_data = data['docs'][0]

            results.append({
                'key': book_key,
                'data': book_data if book_data else None,
                'status_code': status_code if book_data else 404,
                'error': None if book_data else {'error': 'RESOURCE_NOT_FOUND', 'message': 'Book not found'}
            })

        return results, 200
