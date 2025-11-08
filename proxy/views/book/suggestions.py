from rest_framework.response import Response
from rest_framework import status as http_status, serializers
from .base import OpenLibraryBaseView
from proxy.serializers import BookDetailSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class BooksSuggestionsView(OpenLibraryBaseView):

    @extend_schema(
        tags=['Proxy - Books'],
        summary='Get book suggestions',
        description='''
        Get trending and highly rated books for homepage suggestions.

        This endpoint fetches popular books from Open Library,
        ideal for displaying as recommendations on a homepage or discovery section.

        Returns an object with 'results' (list of books) and 'count' (number of results).
        ''',
        parameters=[
            OpenApiParameter(
                'limit',
                OpenApiTypes.INT,
                description='Number of suggestions to return (default: 20, max: 100)'
            )
        ],
        responses={
            200: {
                "type": "object",
                "properties": {
                    "results": {"type": "array", "items": {}},
                    "count": {"type": "integer"}
                }
            },
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        limit = int(request.query_params.get('limit', 20))
        limit = min(limit, 100)

        client = self.get_client()
        mapper = self.get_mapper()

        data, status_code = client.get_trending_books(limit=limit)

        if status_code != http_status.HTTP_200_OK:
            return Response(data, status=status_code)

        if 'docs' not in data:
            return Response({'results': [], 'count': 0}, status=http_status.HTTP_200_OK)

        docs = data.get('docs', [])
        results = [mapper.map_search_item(doc).to_dict() for doc in docs]

        return Response({'results': results, 'count': len(results)}, status=http_status.HTTP_200_OK)
