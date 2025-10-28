from .base import OpenLibraryBaseView
from .utils import normalize_search_item
from proxy.serializers import BooksSuggestionsResponseSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class BooksSuggestionsView(OpenLibraryBaseView):
    def transform_results(self, data):
        if 'docs' not in data: return {'results': [], 'count': 0}

        docs = data.get('docs', [])
        results = [normalize_search_item(doc) for doc in docs]

        return {
            'results': results,
            'count': len(results)
        }

    @extend_schema(
        tags=['Proxy - Books'],
        summary='Get book suggestions',
        description='''
        Get trending and highly rated books for homepage suggestions.

        This endpoint fetches popular books from Open Library,
        ideal for displaying as recommendations on a homepage or discovery section.
        ''',
        parameters=[
            OpenApiParameter(
                'limit',
                OpenApiTypes.INT,
                description='Number of suggestions to return (default: 20, max: 100)'
            )
        ],
        responses={
            200: BooksSuggestionsResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        limit = int(request.query_params.get('limit', 20))
        limit = min(limit, 100)

        client = self.get_client()

        data, status_code = client.get_trending_books(limit=limit)

        return self.handle_api_call(
            lambda: (data, status_code),
            transformer=self.transform_results
        )
