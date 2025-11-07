from .base import TMDBBaseView
from proxy.serializers import TVShowDetailSerializer, ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from proxy.exceptions import NotFoundError
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework.response import Response
from rest_framework import status as http_status

class VideoTvDetailView(TMDBBaseView):
    @extend_schema(
        tags=['Proxy - Video'],
        summary='Get TV show details',
        description='Retrieve detailed information about a specific TV show including all seasons.',
        parameters=[
            OpenApiParameter(
                'tv_id',
                OpenApiTypes.INT,
                OpenApiParameter.PATH,
                required=True,
                description='TMDB TV show ID'
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
            200: TVShowDetailSerializer,
            404: ErrorResponseSerializer
        }
    )
    def get(self, request, tv_id):
        client = self.get_client()
        mapper = TMDBMapper(client)
        country = request.query_params.get('country', None)

        tv_show, status_code = mapper.get_tv_show_complete(int(tv_id), country)
        if status_code != http_status.HTTP_200_OK or not tv_show:
            raise NotFoundError('TV show')

        return Response(tv_show.to_dict(), status=http_status.HTTP_200_OK)
