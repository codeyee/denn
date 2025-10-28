from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from proxy.clients.tmdb import TMDBClient
from proxy.clients.igdb import IGDBClient
from proxy.clients.spotify import SpotifyClient
from proxy.clients.openlibrary import OpenLibraryClient
from proxy.views.video.utils import normalize_search_item as normalize_video
from proxy.views.games.utils import normalize_search_item as normalize_game
from proxy.views.music.utils import normalize_album_search as normalize_music
from proxy.views.book.utils import normalize_search_item as normalize_book
from proxy.serializers import HomepageResponseSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class HomepageView(APIView):

    @extend_schema(
        tags=['Proxy - Homepage'],
        summary='Get homepage suggestions',
        description='''
        Get aggregated suggestions from all categories for homepage display.

        This endpoint fetches popular/trending content from all available APIs:
        - Movies and TV shows from TMDB
        - Games from IGDB
        - Music albums from Spotify
        - Books from Open Library

        Returns a limited number of items per category, ideal for homepage recommendations.
        ''',
        parameters=[
            OpenApiParameter(
                'limit',
                OpenApiTypes.INT,
                description='Number of suggestions per category (default: 10, max: 50)'
            )
        ],
        responses={
            200: HomepageResponseSerializer,
            500: ErrorResponseSerializer
        }
    )
    def get(self, request):
        limit = int(request.query_params.get('limit', 10))
        limit = min(limit, 50)

        video_results = []
        games_results = []
        music_results = []
        books_results = []

        try:
            tmdb_client = TMDBClient()

            movies_data, movies_status = tmdb_client.get_popular_movies(page=1)
            if movies_status == 200 and 'results' in movies_data:
                for item in movies_data['results'][:limit // 2]:
                    if item.get('media_type') != 'person':
                        video_results.append(normalize_video(item, 'movie'))

            tv_data, tv_status = tmdb_client.get_popular_tv(page=1)
            if tv_status == 200 and 'results' in tv_data:
                for item in tv_data['results'][:limit // 2]:
                    if item.get('media_type') != 'person':
                        video_results.append(normalize_video(item, 'tv'))

            video_results = video_results[:limit]
        except Exception as e:
            print(f"Error fetching video suggestions: {e}")

        try:
            igdb_client = IGDBClient()
            games_data, games_status = igdb_client.get_popular_games(limit=limit, offset=0)

            if games_status == 200 and isinstance(games_data, list):
                games_results = [normalize_game(item) for item in games_data[:limit]]
        except Exception as e:
            print(f"Error fetching games suggestions: {e}")

        try:
            spotify_client = SpotifyClient()
            music_data, music_status = spotify_client.get_new_releases(limit=limit, offset=0)

            if music_status == 200 and 'albums' in music_data:
                albums = music_data['albums'].get('items', [])
                music_results = [normalize_music(album) for album in albums[:limit] if album]
        except Exception as e:
            print(f"Error fetching music suggestions: {e}")

        try:
            openlibrary_client = OpenLibraryClient()
            books_data, books_status = openlibrary_client.get_trending_books(limit=limit)

            if books_status == 200 and 'docs' in books_data:
                docs = books_data.get('docs', [])
                books_results = [normalize_book(doc) for doc in docs[:limit]]
        except Exception as e:
            print(f"Error fetching books suggestions: {e}")

        response_data = {
            'suggestions': {
                'video': video_results,
                'games': games_results,
                'music': music_results,
                'books': books_results
            }
        }

        return Response(response_data, status=http_status.HTTP_200_OK)
