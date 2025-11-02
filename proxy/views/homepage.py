from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from proxy.clients.tmdb import TMDBClient
from proxy.clients.igdb import IGDBClient
from proxy.clients.spotify import SpotifyClient
from proxy.clients.openlibrary import OpenLibraryClient
from proxy.views.video.utils import normalize_search_item as normalize_video
from proxy.views.games.utils import normalize_search_item as normalize_game
from proxy.views.music.utils import normalize_album_search as normalize_music, should_include_album
from proxy.views.book.utils import normalize_search_item as normalize_book
from proxy.serializers import HomepageResponseSerializer, ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from concurrent.futures import ThreadPoolExecutor
from core.cache_utils import cached_view

class HomepageView(APIView):

    @extend_schema(
        tags=['Proxy - Suggestions'],
        summary='Get homepage suggestions',
        description='''
        Get aggregated suggestions from all categories for homepage display.

        This endpoint fetches popular/trending content from all available APIs:
        - Movies and TV shows from TMDB
        - Games from IGDB
        - Music albums from Spotify
        - Books from Open Library

        Returns a limited number of items per category, ideal for homepage recommendations.

        **Caching:** This endpoint is cached for 6 hours to improve performance and reduce external API calls.
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
    @cached_view(cache_type='homepage', timeout= 3600 * 12)
    def get(self, request):
        limit = int(request.GET.get('limit', 10))
        limit = min(limit, 50)

        movie_results = []
        tv_show_results = []
        games_results = []
        music_results = []
        books_results = []

        try:
            tmdb_client = TMDBClient()
        except Exception as e:
            tmdb_client = None
            print(f"Error initializing TMDB client: {e}")

        try:
            igdb_client = IGDBClient()
        except Exception as e:
            igdb_client = None
            print(f"Error initializing IGDB client: {e}")

        try:
            spotify_client = SpotifyClient()
        except Exception as e:
            spotify_client = None
            print(f"Error initializing Spotify client: {e}")

        try:
            openlibrary_client = OpenLibraryClient()
        except Exception as e:
            openlibrary_client = None
            print(f"Error initializing OpenLibrary client: {e}")

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {}

            if tmdb_client:
                futures['movies'] = executor.submit(tmdb_client.get_popular_movies, 1)
                futures['tv'] = executor.submit(tmdb_client.get_popular_tv, 1)

            if igdb_client:
                futures['games'] = executor.submit(igdb_client.get_popular_games, limit, 0)

            if spotify_client:
                futures['music'] = executor.submit(spotify_client.get_new_releases, limit, 0)

            if openlibrary_client:
                futures['books'] = executor.submit(openlibrary_client.get_trending_books, limit)

            try:
                if 'movies' in futures:
                    movies_data, movies_status = futures['movies'].result()
                    if movies_status == 200 and 'results' in movies_data:
                        for item in movies_data['results'][:limit]:
                            if item.get('media_type') != 'person':
                                movie_results.append(normalize_video(item, 'movie'))
            except Exception as e:
                print(f"Error fetching video (movies) suggestions: {e}")

            try:
                if 'tv' in futures:
                    tv_data, tv_status = futures['tv'].result()
                    if tv_status == 200 and 'results' in tv_data:
                        for item in tv_data['results'][:limit]:
                            if item.get('media_type') != 'person':
                                tv_show_results.append(normalize_video(item, 'tv'))
            except Exception as e:
                print(f"Error fetching video (tv) suggestions: {e}")

            try:
                if 'games' in futures:
                    games_data, games_status = futures['games'].result()
                    if games_status == 200 and isinstance(games_data, list):
                        games_results = [normalize_game(item) for item in games_data[:limit]]
            except Exception as e:
                print(f"Error fetching games suggestions: {e}")

            try:
                if 'music' in futures:
                    music_data, music_status = futures['music'].result()
                    if music_status == 200 and 'albums' in music_data:
                        albums = music_data['albums'].get('items', [])
                        filtered_albums = []
                        seen_ids = set()

                        for album in albums:
                            if not album or not album.get('id'):
                                continue
                            if should_include_album(album):
                                album_id = album.get('id')
                                if album_id not in seen_ids:
                                    seen_ids.add(album_id)
                                    filtered_albums.append(normalize_music(album))

                        offset = len(albums)
                        max_per_request = 50
                        fetch_multiplier = 2

                        while len(filtered_albums) < limit and spotify_client:
                            remaining = limit - len(filtered_albums)
                            request_limit = min(remaining * fetch_multiplier, max_per_request)

                            more_data, more_status = spotify_client.get_new_releases(
                                limit=request_limit, offset=offset
                            )

                            if more_status != 200 or 'albums' not in more_data:
                                break

                            more_albums = more_data['albums'].get('items', [])
                            if not more_albums:
                                break

                            for album in more_albums:
                                if not album or not album.get('id'):
                                    continue
                                if should_include_album(album):
                                    album_id = album.get('id')
                                    if album_id not in seen_ids:
                                        seen_ids.add(album_id)
                                        filtered_albums.append(normalize_music(album))
                                        if len(filtered_albums) >= limit:
                                            break

                            offset += len(more_albums)
                            if len(more_albums) < request_limit:
                                break

                        music_results = filtered_albums[:limit]
            except Exception as e:
                print(f"Error fetching music suggestions: {e}")

            try:
                if 'books' in futures:
                    books_data, books_status = futures['books'].result()
                    if books_status == 200 and 'docs' in books_data:
                        docs = books_data.get('docs', [])
                        books_results = [normalize_book(doc) for doc in docs[:limit]]
            except Exception as e:
                print(f"Error fetching books suggestions: {e}")

        response_data = {
            'movies': movie_results,
            'tv_shows': tv_show_results,
            'games': games_results,
            'music': music_results,
            'books': books_results
        }

        return Response(response_data, status=http_status.HTTP_200_OK)
