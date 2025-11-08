from rest_framework.response import Response
from rest_framework import status as http_status
from proxy.views.base import IGDBBaseView
from proxy.exceptions import MissingParameterError
from proxy.serializers.games import GameSearchResponseSerializer
from proxy.serializers.common import ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class GameSearchView(IGDBBaseView):

    @extend_schema(
        tags=['Games'],
        summary='Search video games',
        description='''
        Search for video games by title using IGDB.

        Note: IGDB doesn't provide total result counts, so total_results may be null.
        ''',
        parameters=[
            OpenApiParameter('query', OpenApiTypes.STR, required=True, description='Search query'),
            OpenApiParameter('limit', OpenApiTypes.INT, description='Results per page (1-500, default: 50)'),
            OpenApiParameter('page', OpenApiTypes.INT, description='Page number (default: 1)')
        ],
        responses={
            200: GameSearchResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        query = request.query_params.get('query')
        if not query:
            raise MissingParameterError('query')

        limit = int(request.query_params.get('limit', 50))
        page = int(request.query_params.get('page', 1))
        offset = (page - 1) * limit

        client = self.get_client()
        mapper = self.get_mapper()

        data, status_code = client.search_games(query=query, limit=limit, offset=offset)

        if status_code != http_status.HTTP_200_OK:
            return Response(data, status=status_code)

        if not isinstance(data, list):
            return Response(data, status=status_code)

        results = [mapper.map_search_item(item).to_dict() for item in data]

        has_more = len(results) == limit

        metadata = {
            'page': page,
            'page_results': len(results),
            'total_pages': page + 1 if has_more else page,
            'total_results': len(results) if not has_more else None
        }

        return Response({'metadata': metadata, 'results': results}, status=http_status.HTTP_200_OK)