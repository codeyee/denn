from .base import SpotifyBaseView
from .utils import normalize_album_search
from proxy.serializers import MusicSuggestionsResponseSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class MusicSuggestionsView(SpotifyBaseView):
    def transform_results(self, data):
        if 'albums' not in data: return {'results': [], 'count': 0}

        albums = data['albums'].get('items', [])
        results = [normalize_album_search(album) for album in albums if album]

        return {
            'results': results,
            'count': len(results)
        }

    @extend_schema(
        tags=['Proxy - Music'],
        summary='Get music suggestions',
        description='''
        Get new release albums for homepage suggestions.

        This endpoint fetches recently released albums from Spotify,
        ideal for displaying as recommendations on a homepage or discovery section.
        ''',
        parameters=[
            OpenApiParameter(
                'limit',
                OpenApiTypes.INT,
                description='Number of suggestions to return (default: 20, max: 50)'
            )
        ],
        responses={
            200: MusicSuggestionsResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        limit = int(request.query_params.get('limit', 20))
        limit = min(limit, 50)

        client = self.get_client()

        data, status_code = client.get_new_releases(limit=limit, offset=0)

        return self.handle_api_call(
            lambda: (data, status_code),
            transformer=self.transform_results
        )
