from rest_framework import status as http_status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from proxy.serializers.tv_shows import TVShowDetailSerializer
from proxy.serializers.common import ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from core.exceptions import MissingParameterException, InvalidParameterException
from ..base import TMDBBaseView
from concurrent.futures import ThreadPoolExecutor


class TVShowBulkView(TMDBBaseView):

    def _validate_ids(self, request):
        ids_param = request.query_params.get('ids', '')
        if not ids_param:
            raise MissingParameterException('ids')

        return ids_param

    def _validate_tv_ids(self, ids_param):
        tv_ids = [id.strip() for id in ids_param.split(',') if id.strip()]

        if not tv_ids:
            raise InvalidParameterException('No valid TV show IDs provided')

        return tv_ids

    def _validate_max_ids(self, tv_ids):
        if len(tv_ids) > 50:
            raise InvalidParameterException('Maximum 50 TV show IDs allowed per request')

        return tv_ids

    def _validate_country(self, country):
        if country and len(country) != 2:
            raise InvalidParameterException('Country must be a valid ISO 3166-1 alpha-2 code')

        return country

    @extend_schema(
        tags=['Proxy - TV Shows'],
        summary='Bulk get TV show details',
        description='Retrieve detailed information about multiple TV shows from TMDB in a single request. Returns a list of TV show details.',
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
            200: TVShowDetailSerializer(many=True),
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        ids_param = self._validate_ids(request)
        tv_ids = self._validate_tv_ids(ids_param)
        tv_ids = self._validate_max_ids(tv_ids)
        country = self._validate_country(request)

        client = self.get_client()
        mapper = self.get_mapper()

        results = []
        with ThreadPoolExecutor(max_workers=10) as executor:
            futures = {executor.submit(mapper.get_tv_show_complete, tv_id, country): tv_id for tv_id in tv_ids}
            for future in futures:
                tv_show, status = future.result()

                if status == http_status.HTTP_200_OK and tv_show:
                    results.append(tv_show.to_dict())

        results = self.apply_dynamic_fields(results, request)
        return Response(results, status=http_status.HTTP_200_OK)
