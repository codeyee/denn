from rest_framework import status as http_status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from proxy.serializers.tv_shows import BulkTVShowsResponseSerializer
from proxy.serializers.common import ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from proxy.exceptions import MissingParameterError, InvalidParameterError
from ..base import TMDBBaseView
from concurrent.futures import ThreadPoolExecutor


class TVShowBulkView(TMDBBaseView):
    @extend_schema(
        tags=['TV Shows'],
        summary='Bulk get TV show details',
        description='Retrieve detailed information about multiple TV shows from TMDB in a single request. Returns a dictionary with TV show IDs as keys and TV show details (or null) as values.',
        parameters=[
            OpenApiParameter(
                'ids',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=True,
                description='Comma-separated list of TMDB TV show IDs (e.g., "1396,1668,94605")'
            ),
            OpenApiParameter(
                'country',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=False,
                description='ISO 3166-1 alpha-2 country code (e.g., US, GB, FR) to filter providers by country'
            )
        ],
        responses={
            200: BulkTVShowsResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        ids_param = request.query_params.get('ids', '')

        if not ids_param:
            raise MissingParameterError('ids')

        try:
            tv_ids = [int(id.strip()) for id in ids_param.split(',') if id.strip()]
        except ValueError:
            raise InvalidParameterError('Invalid TV show IDs. Must be comma-separated integers.')

        if not tv_ids:
            raise InvalidParameterError('No valid TV show IDs provided')

        if len(tv_ids) > 50:
            raise InvalidParameterError('Maximum 50 TV show IDs allowed per request')

        client = self.get_client()
        mapper = TMDBMapper(client)
        country = request.query_params.get('country', None)

        results = {}
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(mapper.get_tv_show_complete, tv_id, country): tv_id for tv_id in tv_ids}
            for future in futures:
                tv_id = futures[future]
                tv_show, status = future.result()

                if status == http_status.HTTP_200_OK:
                    results[tv_id] = tv_show.to_dict()
                else:
                    results[tv_id] = None

        return Response(results, status=http_status.HTTP_200_OK)
