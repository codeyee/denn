import os
from proxy.clients.base.cached import CachedAPIClient
from django.conf import settings
from typing import Dict, Any, Tuple
from concurrent.futures import ThreadPoolExecutor

OPENLIBRARY_USER_AGENT = os.getenv("OPENLIBRARY_USER_AGENT")
OPENLIBRARY_BASE_URL = "https://openlibrary.org"
OPENLIBRARY_COVERS_BASE_URL = "https://covers.openlibrary.org"


class OpenLibraryClient(CachedAPIClient):
    def __init__(self):
        super().__init__(base_url=OPENLIBRARY_BASE_URL, api_name='openlibrary')
        self.covers_base_url = OPENLIBRARY_COVERS_BASE_URL
        self.user_agent = settings.API_KEYS_CACHE['openlibrary']['user_agent'] or OPENLIBRARY_USER_AGENT
        settings.API_KEYS_CACHE['openlibrary']['user_agent'] = self.user_agent
        self._save_api_keys()

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
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_openlibrary_search',
            params=params,
            operation='search',
            query=query,
            page=page,
            limit=limit
        )

    def get_book_by_key(self, book_id: str) -> Tuple[Dict[str, Any], int]:
        """
        Get book details by OpenLibrary work ID.

        Uses search endpoint with the book ID as query to get consistent format.
        Returns the first search result which matches the requested book.

        Args:
            book_id: OpenLibrary work ID (e.g., 'OL274505W' or '/works/OL274505W')

        Returns:
            Tuple of (book_data, status_code)
        """
        # Use search_by_key to get book in search format (consistent with homepage)
        data, status_code = self.search_by_key(book_id)

        if status_code == 200 and 'docs' in data and len(data['docs']) > 0:
            # Return first result (the book itself)
            return data['docs'][0], 200

        # Not found
        return {'error': 'RESOURCE_NOT_FOUND', 'message': 'Book not found'}, 404

    def search_by_key(self, key: str) -> Tuple[Dict[str, Any], int]:
        endpoint = 'search.json'
        params = {
            'q': key,
            'limit': 1,
            'fields': '*'
        }
        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_openlibrary_search',
            params=params,
            operation='search',
            query=key,
            limit=1
        )

    def get_bulk_books(self, book_ids: list[str]) -> Tuple[list[Dict[str, Any]], int]:
        cache_key = self._generate_cache_key('api_openlibrary_bulk', book_ids=book_ids)
        cached_response = self._get_cached_response(cache_key)
        if cached_response is not None:
            return cached_response

        results = []

        def fetch_book(book_id: str) -> Dict[str, Any]:
            data, status_code = self.search_by_key(book_id)

            book_data = None
            if status_code == 200 and 'docs' in data and len(data['docs']) > 0:
                book_data = data['docs'][0]

            return {
                'key': book_id,
                'data': book_data if book_data else None,
                'status_code': status_code if book_data else 404,
                'error': None if book_data else {'error': 'RESOURCE_NOT_FOUND', 'message': 'Book not found'}
            }

        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = [executor.submit(fetch_book, book_id) for book_id in book_ids]
            results = [future.result() for future in futures]

        cache_timeout = self._get_cache_timeout('api_openlibrary_details')
        self._cache_response(cache_key, results, 200, cache_timeout)

        return results, 200

    def get_trending_books(self, limit: int = 50) -> Tuple[Dict[str, Any], int]:
        """
        Get trending/popular books using search endpoint.

        OpenLibrary doesn't support q=* queries, so we use a broad search term
        like 'bestseller' sorted by rating to get popular books.

        Args:
            limit: Maximum number of books to return

        Returns:
            Tuple of (response_data, status_code)
            Response format is standard search.json with 'docs' array
        """
        endpoint = 'search.json'
        params = {
            'q': 'bestseller',  # Broad search term that returns popular books
            'sort': 'rating',   # Sort by rating to get best books first
            'limit': limit,
            'fields': '*'
        }

        return self.cached_get(
            endpoint=endpoint,
            cache_type='api_openlibrary_trending',
            params=params,
            operation='trending',
            limit=limit
        )
