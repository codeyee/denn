from .base import OpenLibraryBaseView
from .utils import normalize_search_item
from proxy.errors import build_error_response, get_http_status, MISSING_QUERY
from proxy.serializers import BookSearchResponseSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from typing import Dict, Any

class BookSearchView(OpenLibraryBaseView):
    def transform_search_results(self, data: Dict[str, Any]) -> Dict[str, Any]:
        if 'docs' not in data: return data

        results = [normalize_search_item(item) for item in data['docs']]

        num_found = data.get('numFound', 0)
        limit = data.get('limit', 10)
        offset = data.get('offset', 0)

        current_page = (offset // limit) + 1 if limit > 0 else 1
        total_pages = (num_found // limit) + (1 if num_found % limit > 0 else 0) if limit > 0 else 1

        return {
            'metadata': {
                'page': current_page,
                'page_results': len(results),
                'total_pages': total_pages,
                'total_results': num_found,
            },
            'results': results,
        }

    @extend_schema(
        tags=['Proxy - Books'],
        summary='Search books',
        description='Search for books by title, author, or ISBN using OpenLibrary.',
        parameters=[
            OpenApiParameter('query', OpenApiTypes.STR, required=True, description='Search query (title, author, or ISBN)'),
            OpenApiParameter('limit', OpenApiTypes.INT, description='Results per page (default: 50)'),
            OpenApiParameter('page', OpenApiTypes.INT, description='Page number (default: 1)')
        ],
        responses={
            200: BookSearchResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        query = request.query_params.get('query')

        if not query:
            error_response = build_error_response(MISSING_QUERY)
            return self.transform_response(error_response, get_http_status(MISSING_QUERY))

        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 50))

        client = self.get_client()
        return self.handle_api_call(
            client.search,
            transformer=self.transform_search_results,
            query=query,
            page=page,
            limit=limit
        )
