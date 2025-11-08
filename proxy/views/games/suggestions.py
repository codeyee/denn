from rest_framework.response import Response
from rest_framework import status as http_status, serializers
from .base import IGDBBaseView
from proxy.serializers import GameDetailSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class GamesSuggestionsView(IGDBBaseView):

    @extend_schema(
        tags=['Proxy - Games'],
        summary='Get game suggestions',
        description='''
        Get popular games for homepage suggestions.

        This endpoint fetches highly rated and popular games from IGDB,
        sorted by aggregated rating, ideal for displaying as recommendations.

        Returns an object with 'results' (list of games) and 'count' (number of results).
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

        data, status_code = client.get_popular_games(limit=limit, offset=0)

        if status_code != http_status.HTTP_200_OK:
            return Response(data, status=status_code)

        if not isinstance(data, list):
            return Response({'results': [], 'count': 0}, status=http_status.HTTP_200_OK)

        results = [mapper.map_search_item(item).to_dict() for item in data]

        return Response({'results': results, 'count': len(results)}, status=http_status.HTTP_200_OK)
