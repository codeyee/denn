from ..base import TMDBBaseView
from proxy.serializers.tv_shows import TVShowDetailSerializer
from proxy.serializers.common import ErrorResponseSerializer
from proxy.mappers import TMDBMapper
from core.exceptions import NotFoundException
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from rest_framework.response import Response
from rest_framework import status as http_status


class TVShowDetailView(TMDBBaseView):
    @extend_schema(
        tags=['Proxy - TV Shows'],
        summary='Get TV show details',
        description='''
        Retrieve detailed information about a specific TV show including all seasons.

        **Expand Parameter:**
        - `expand=seasons` - Fetch full season details with all episodes (equivalent to calling /season/:season_number for each season)

        **Dynamic Field Selection:**
        - `fields` - Select specific fields to return, reducing payload size. Supports dot notation.
        
        **Image Size Limiting:**
        - `images_size` - Limit the number of images returned in image lists.

        **Examples:**
        - `?expand=seasons` - Get TV show with full season and episode details
        - `?fields=id,title,seasons.name,seasons.episodes.title` - Get specific nested fields from expanded seasons
        - `?expand=seasons&fields=id,title,seasons.episodes.title&country=US` - Combine expand, fields, and country filter
        - `?fields=id,title,cover.url,external_ids.imdb_id` - Get only basic info with cover and IMDB ID
        - `?images_size=4` - Limit images to 4 per list
        ''',
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
            ),
            OpenApiParameter(
                'expand',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=False,
                description='Comma-separated list of relationships to expand. Options: "seasons" (fetches full season details with episodes)'
            ),
            OpenApiParameter(
                'fields',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=False,
                description='Comma-separated list of fields to include. Supports dot notation for nested fields (e.g., "id,title,seasons.episodes.title")'
            ),
            OpenApiParameter(
                'images_size',
                OpenApiTypes.INT,
                OpenApiParameter.QUERY,
                required=False,
                description='Maximum number of images to return in the images list (default: 18)'
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
        expand_param = request.query_params.get('expand', '')
        expand_seasons = 'seasons' in expand_param.split(',')
        images_size = int(request.query_params.get('images_size', 18))

        tv_show, status_code = mapper.get_tv_show_complete(
            tv_id=int(tv_id),
            country=country,
            expand_seasons=expand_seasons
        )
        if status_code != http_status.HTTP_200_OK or not tv_show:
            raise NotFoundException('TV show')

        data = tv_show.to_dict(images_size=images_size)
        data = self.apply_dynamic_fields(data, request)
        return Response(data, status=http_status.HTTP_200_OK)
