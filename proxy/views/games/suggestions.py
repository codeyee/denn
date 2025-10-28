from .base import IGDBBaseView
from .utils import normalize_search_item
from proxy.serializers import GamesSuggestionsResponseSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class GamesSuggestionsView(IGDBBaseView):
    def transform_results(self, data):
        if not isinstance(data, list): return {'results': [], 'count': 0}

        results = [normalize_search_item(item) for item in data]

        return {
            'results': results,
            'count': len(results)
        }

    @extend_schema(
        tags=['Proxy - Games'],
        summary='Get game suggestions',
        description='''
        Get popular games for homepage suggestions.

        This endpoint fetches highly rated and popular games from IGDB,
        sorted by aggregated rating, ideal for displaying as recommendations.
        ''',
        parameters=[
            OpenApiParameter(
                'limit',
                OpenApiTypes.INT,
                description='Number of suggestions to return (default: 20, max: 100)'
            )
        ],
        responses={
            200: GamesSuggestionsResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        limit = int(request.query_params.get('limit', 20))
        limit = min(limit, 100)

        client = self.get_client()

        data, status_code = client.get_popular_games(limit=limit, offset=0)

        return self.handle_api_call(
            lambda: (data, status_code),
            transformer=self.transform_results
        )
