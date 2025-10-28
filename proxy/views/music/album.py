from .base import SpotifyBaseView
from .utils import normalize_album
from drf_spectacular.utils import extend_schema, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class MusicAlbumDetailView(SpotifyBaseView):
    @extend_schema(
        tags=['Proxy - Music'],
        summary='Get album details',
        description='Retrieve detailed information about a specific album including all tracks.',
        parameters=[
            OpenApiParameter('album_id', OpenApiTypes.STR, OpenApiParameter.PATH, required=True, description='Spotify album ID')
        ],
        responses={
            200: OpenApiExample(
                'Album Details',
                value={
                    'id': '7ycBtnsMtyVbbwTfJwRjSP',
                    'title': 'Graduation',
                    'authors': ['Kanye West'],
                    'image_url': 'https://i.scdn.co/image/ab67616d0000b2732c6ce1cbb235c45f8ded730b',
                    'release_date': '2007-09-11',
                    'total_tracks': 13,
                    'album_type': 'album',
                    'external_url': 'https://open.spotify.com/album/7ycBtnsMtyVbbwTfJwRjSP',
                    'tracks': [
                        {
                            'id': '2bzbPbLbq3OdYXlCMxKuni',
                            'title': 'Good Morning',
                            'authors': ['Kanye West'],
                            'track_number': 1,
                            'duration_seconds': 193,
                            'external_url': 'https://open.spotify.com/track/2bzbPbLbq3OdYXlCMxKuni'
                        }
                    ]
                }
            ),
            404: OpenApiExample('Not Found', value={'error': 'RESOURCE_NOT_FOUND', 'message': 'Album not found'})
        }
    )
    def get(self, request, album_id: str):
        client = self.get_client()
        return self.handle_api_call(
            client.get_album,
            transformer=normalize_album,
            album_id=album_id
        )

