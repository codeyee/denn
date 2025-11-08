from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from proxy.clients.tmdb import TMDBClient
from proxy.clients.igdb import IGDBClient
from proxy.clients.spotify import SpotifyClient
from proxy.clients.openlibrary import OpenLibraryClient
from proxy.mappers.tmdb import TMDBMapper
from proxy.mappers.igdb import IGDBMapper
from proxy.mappers.spotify import SpotifyMapper
from proxy.mappers.openlibrary import OpenLibraryMapper
from proxy.constants import MediaType
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
            ),
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
            tmdb_mapper = TMDBMapper(tmdb_client)
        except Exception as e:
            tmdb_client = None
            tmdb_mapper = None
            print(f"Error initializing TMDB client: {e}")

        try:
            igdb_client = IGDBClient()
            igdb_mapper = IGDBMapper(igdb_client)
        except Exception as e:
            igdb_client = None
            igdb_mapper = None
            print(f"Error initializing IGDB client: {e}")

        try:
            spotify_client = SpotifyClient()
            spotify_mapper = SpotifyMapper(spotify_client)
        except Exception as e:
            spotify_client = None
            spotify_mapper = None
            print(f"Error initializing Spotify client: {e}")

        try:
            openlibrary_client = OpenLibraryClient()
            openlibrary_mapper = OpenLibraryMapper(openlibrary_client)
        except Exception as e:
            openlibrary_client = None
            openlibrary_mapper = None
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
                if 'movies' in futures and tmdb_mapper:
                    movies_data, movies_status = futures['movies'].result()
                    if movies_status == http_status.HTTP_200_OK and 'results' in movies_data:
                        for item in movies_data['results'][:limit]:
                            raw_media_type = item.get('media_type', '').lower()
                            if raw_media_type != 'person':
                                movie_results.append(tmdb_mapper.map_search_item(item, MediaType.MOVIE).to_dict())
            except Exception as e:
                print(f"Error fetching video (movies) suggestions: {e}")

            try:
                if 'tv' in futures and tmdb_mapper:
                    tv_data, tv_status = futures['tv'].result()
                    if tv_status == http_status.HTTP_200_OK and 'results' in tv_data:
                        for item in tv_data['results'][:limit]:
                            raw_media_type = item.get('media_type', '').lower()
                            if raw_media_type != 'person':
                                tv_show_results.append(tmdb_mapper.map_search_item(item, MediaType.TV_SHOW).to_dict())
            except Exception as e:
                print(f"Error fetching video (tv) suggestions: {e}")

            try:
                if 'games' in futures and igdb_mapper:
                    games_data, games_status = futures['games'].result()
                    if games_status == 200 and isinstance(games_data, list):
                        games_results = [igdb_mapper.map_search_item(item).to_dict() for item in games_data[:limit]]
            except Exception as e:
                print(f"Error fetching games suggestions: {e}")

            try:
                if 'music' in futures and spotify_mapper:
                    music_data, music_status = futures['music'].result()
                    if music_status == 200 and 'albums' in music_data:
                        albums = music_data['albums'].get('items', [])
                        filtered_albums = []
                        seen_ids = set()

                        for album in albums:
                            if not album or not album.get('id'):
                                continue
                            album_type = (album.get('album_type') or '').lower()
                            if album_type != 'single':
                                album_id = album.get('id')
                                if album_id not in seen_ids:
                                    seen_ids.add(album_id)
                                    filtered_albums.append(spotify_mapper.map_search_item(album).to_dict())

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
                                album_type = (album.get('album_type') or '').lower()
                                if album_type != 'single':
                                    album_id = album.get('id')
                                    if album_id not in seen_ids:
                                        seen_ids.add(album_id)
                                        filtered_albums.append(spotify_mapper.map_search_item(album).to_dict())
                                        if len(filtered_albums) >= limit:
                                            break

                            offset += len(more_albums)
                            if len(more_albums) < request_limit:
                                break

                        music_results = filtered_albums[:limit]
            except Exception as e:
                print(f"Error fetching music suggestions: {e}")

            try:
                if 'books' in futures and openlibrary_mapper:
                    books_data, books_status = futures['books'].result()
                    if books_status == 200 and 'docs' in books_data:
                        docs = books_data.get('docs', [])
                        books_results = [openlibrary_mapper.map_search_item(doc).to_dict() for doc in docs[:limit]]
            except Exception as e:
                print(f"Error fetching books suggestions: {e}")

        try:
                with ThreadPoolExecutor(max_workers=10) as detail_executor:
                    tmdb_movie_futures = {}
                    tmdb_tv_futures = {}
                    if tmdb_client and tmdb_mapper:
                        for item in movie_results:
                            item_id = item.get('id')
                            if item_id is None:
                                continue
                            tmdb_movie_futures[item_id] = detail_executor.submit(
                                tmdb_mapper.get_movie_complete, int(item_id)
                            )
                        for item in tv_show_results:
                            item_id = item.get('id')
                            if item_id is None:
                                continue
                            tmdb_tv_futures[item_id] = detail_executor.submit(
                                tmdb_mapper.get_tv_show_complete, int(item_id)
                            )

                    igdb_details_map = {}
                    if igdb_client and igdb_mapper and games_results:
                        try:
                            game_ids = [item.get('id') for item in games_results if item.get('id') is not None]
                            games_data, games_status = igdb_client.get_bulk_games(game_ids)
                            if games_status == 200 and isinstance(games_data, list):
                                for game in games_data:
                                    gid = game.get('id')
                                    if gid is not None:
                                        igdb_details_map[gid] = igdb_mapper.map_detail(game).to_dict()
                        except Exception as e:
                            print(f"Error fetching IGDB details: {e}")

                    spotify_details_map = {}
                    if spotify_client and spotify_mapper and music_results:
                        try:
                            album_ids = [item.get('id') for item in music_results if item.get('id')]
                            albums_data, albums_status = spotify_client.get_bulk_albums(album_ids)
                            if albums_status == 200 and isinstance(albums_data, dict):
                                for album in albums_data.get('albums', []) or []:
                                    aid = album.get('id')
                                    if aid:
                                        spotify_details_map[aid] = spotify_mapper.map_detail(album).to_dict()
                        except Exception as e:
                            print(f"Error fetching Spotify details: {e}")

                    openlibrary_details_map = {}
                    if openlibrary_client and openlibrary_mapper and books_results:
                        try:
                            book_ids = [item.get('id') for item in books_results if item.get('id')]
                            book_keys = [f"/works/{bid}" for bid in book_ids]
                            bulk_results, bulk_status = openlibrary_client.get_bulk_books(book_keys)

                            if bulk_status == 200 and isinstance(bulk_results, list):
                                for entry in bulk_results:
                                    key = entry.get('key')
                                    data = entry.get('data')

                                    if not key or not data:
                                        continue

                                    try:
                                        bid = key.split('/')[-1]
                                    except Exception:
                                        bid = None

                                    if bid:
                                        openlibrary_details_map[bid] = openlibrary_mapper.map_detail(data).to_dict()

                        except Exception as e:
                            print(f"Error fetching OpenLibrary details: {e}")

                    if tmdb_movie_futures:
                        for idx, item in enumerate(movie_results):
                            item_id = item.get('id')
                            fut = tmdb_movie_futures.get(item_id)
                            if not fut:
                                continue
                            try:
                                movie, status_code = fut.result()
                                if status_code == http_status.HTTP_200_OK and movie:
                                    movie_results[idx] = movie.to_dict()
                            except Exception as e:
                                print(f"Error resolving TMDB movie details for {item_id}: {e}")

                    if tmdb_tv_futures:
                        for idx, item in enumerate(tv_show_results):
                            item_id = item.get('id')
                            fut = tmdb_tv_futures.get(item_id)
                            if not fut:
                                continue
                            try:
                                tv_show, status_code = fut.result()
                                if status_code == http_status.HTTP_200_OK and tv_show:
                                    tv_show_results[idx] = tv_show.to_dict()
                            except Exception as e:
                                print(f"Error resolving TMDB tv details for {item_id}: {e}")

                    if igdb_details_map:
                        for idx, item in enumerate(games_results):
                            gid = item.get('id')
                            if gid in igdb_details_map:
                                games_results[idx] = igdb_details_map[gid]

                    if spotify_details_map:
                        for idx, item in enumerate(music_results):
                            aid = item.get('id')
                            if aid in spotify_details_map:
                                music_results[idx] = spotify_details_map[aid]

                    if openlibrary_details_map:
                        for idx, item in enumerate(books_results):
                            bid = item.get('id')
                            if bid in openlibrary_details_map:
                                books_results[idx] = openlibrary_details_map[bid]

        except Exception as e:
            print(f"Error during details enrichment: {e}")

        if music_results:
            try:
                music_results = [item for item in music_results if (item or {}).get('album_type') != 'single']
            except Exception:
                pass

        response_data = {
            'movies': movie_results,
            'tv_shows': tv_show_results,
            'games': games_results,
            'music': music_results,
            'books': books_results
        }

        return Response(response_data, status=http_status.HTTP_200_OK)
