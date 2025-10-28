from .base import TMDBBaseView
from .utils import normalize_tv
from proxy.serializers import TVShowDetailSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class VideoTvDetailView(TMDBBaseView):
    @extend_schema(
        tags=['Proxy - Video'],
        summary='Get TV show details',
        description='Retrieve detailed information about a specific TV show including all seasons.',
        parameters=[
            OpenApiParameter('tv_id', OpenApiTypes.INT, OpenApiParameter.PATH, required=True, description='TMDB TV show ID')
        ],
        responses={
            200: TVShowDetailSerializer,
            404: ErrorResponseSerializer
        }
    )
    def get(self, request, tv_id):
        client = self.get_client()
        return self.handle_api_call(
            client.get_tv_details,
            transformer=normalize_tv,
            tv_id=int(tv_id)
        )
