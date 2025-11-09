from concurrent.futures import ThreadPoolExecutor
from typing import List, Dict, Any, Tuple, Optional, Callable
from drf_spectacular.types import OpenApiTypes
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import status as http_status
from rest_framework.response import Response
from rest_framework.views import APIView
from core.cache_utils import cached_view
from proxy.clients.igdb import IGDBClient
from proxy.clients.openlibrary import OpenLibraryClient
from proxy.clients.spotify import SpotifyClient
from proxy.clients.tmdb import TMDBClient
from proxy.constants import ContentType
from proxy.exceptions import InvalidParameterException
from proxy.mappers.igdb import IGDBMapper
from proxy.mappers.openlibrary import OpenLibraryMapper
from proxy.mappers.spotify import SpotifyMapper
from proxy.mappers.tmdb import TMDBMapper
from proxy.serializers import HomepageResponseSerializer, ErrorResponseSerializer


class HomepageView(APIView):

    CACHE_CONFIG = {
        'cache_type': 'homepage',
        'timeout': 3600 * 24
    }

    SERVICE_CONFIG = [
        {
            'name': 'tmdb',
            'client_class': TMDBClient,
            'mapper_class': TMDBMapper
        },
        {
            'name': 'igdb',
            'client_class': IGDBClient,
            'mapper_class': IGDBMapper
        },
        {
            'name': 'spotify',
            'client_class': SpotifyClient,
            'mapper_class': SpotifyMapper
        },
        {
            'name': 'openlibrary',
            'client_class': OpenLibraryClient,
            'mapper_class': OpenLibraryMapper
        }
    ]

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.clients: Dict[str, Any] = {}

    @extend_schema(
        tags=['Proxy - Suggestions'],
        summary='Get homepage suggestions',
        description='''
        Get aggregated suggestions from all categories for homepage display.
        ''',
        parameters=[
            OpenApiParameter(
                'limit',
                OpenApiTypes.INT,
                OpenApiParameter.QUERY,
                required=False,
                description='Number of suggestions per category (default: 10, max: 50)'
            ),
            OpenApiParameter(
                'country',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=False,
                description='ISO 3166-1 alpha-2 country code (e.g., US, CO)'
            )
        ],
        responses={
            200: HomepageResponseSerializer,
            500: ErrorResponseSerializer
        }
    )
    @cached_view(
        cache_type=CACHE_CONFIG['cache_type'],
        timeout=CACHE_CONFIG['timeout']
    )
    def get(self, request):
        try:
            limit, country = self._get_valid_params(request)
        except InvalidParameterException as e:
            return Response({'error': str(e)}, status=http_status.HTTP_400_BAD_REQUEST)

        self.clients = self._initialize_clients()

        movies, tv, games, albums, books = self._fetch_initial_data(limit, country)
        movies, tv, games, albums, books = self._enrich_data(movies, tv, games, albums, books, country)

        response_data = self._format_response(movies, tv, games, albums, books)
        return Response(response_data, status=http_status.HTTP_200_OK)

    def _get_valid_params(self, request) -> Tuple[int, Optional[str]]:
        limit = self._validate_limit(request)
        country = self._validate_country(request)
        return limit, country

    def _validate_limit(self, request) -> int:
        try:
            limit = int(request.query_params.get('limit', 10))
            if not (1 <= limit <= 50):
                raise InvalidParameterException('limit must be between 1 and 50')
            return limit
        except ValueError:
            raise InvalidParameterException('limit must be a valid integer')

    def _validate_country(self, request) -> Optional[str]:
        country = request.query_params.get('country', None)
        if country and (len(country) != 2 or not country.isalpha()):
            raise InvalidParameterException('Country must be a valid ISO 3166-1 alpha-2 code')
        return country.upper() if country else None

    def _initialize_clients(self) -> Dict[str, Any]:
        clients = {}
        for config in self.SERVICE_CONFIG:
            name = config['name']
            client, mapper = self._initialize_service(
                config['client_class'],
                config['mapper_class'],
                name
            )
            clients[f'{name}_client'] = client
            clients[f'{name}_mapper'] = mapper
        return clients

    def _initialize_service(self, client_class: type, mapper_class: type, service_name: str) -> Tuple[Optional[object], Optional[object]]:
        try:
            client = client_class()
            mapper = mapper_class(client)
            return client, mapper
        except Exception as e:
            print(f"Error initializing {service_name} client: {e}")
            return None, None

    def _fetch_initial_data(self, limit: int, country: Optional[str]) -> Tuple[List, List, List, List, List]:
        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {}

            if self.clients.get('tmdb_mapper'):
                futures['movies'] = executor.submit(
                    self._fetch_tmdb_movies, self.clients['tmdb_client'], self.clients['tmdb_mapper'], limit)
                futures['tv'] = executor.submit(
                    self._fetch_tmdb_tv, self.clients['tmdb_client'], self.clients['tmdb_mapper'], limit)

            if self.clients.get('igdb_mapper'):
                futures['games'] = executor.submit(
                    self._fetch_igdb_games, self.clients['igdb_client'], self.clients['igdb_mapper'], limit)

            if self.clients.get('spotify_mapper'):
                futures['albums'] = executor.submit(
                    self._fetch_spotify_albums, self.clients['spotify_client'], self.clients['spotify_mapper'], limit, country)

            if self.clients.get('openlibrary_mapper'):
                futures['books'] = executor.submit(
                    self._fetch_openlibrary_books, self.clients['openlibrary_client'], self.clients['openlibrary_mapper'], limit)

            movies = self._get_future_result(futures, 'movies')
            tv = self._get_future_result(futures, 'tv')
            games = self._get_future_result(futures, 'games')
            albums = self._get_future_result(futures, 'albums')
            books = self._get_future_result(futures, 'books')

            return movies, tv, games, albums, books

    def _get_future_result(self, futures: Dict, key: str, default_val: Any = None) -> Any:
        if default_val is None:
            default_val = []
        try:
            return futures[key].result() if key in futures else default_val
        except Exception as e:
            print(f"Error resolving future for {key}: {e}")
            return default_val

    def _get_future_result_safe(self, future, default_val: Any = None) -> Any:
        if default_val is None:
            default_val = {}
        try:
            return future.result() if future else default_val
        except Exception as e:
            print(f"Error resolving future: {e}")
            return default_val

    def _fetch_tmdb_movies(self, client: TMDBClient, mapper: TMDBMapper, limit: int) -> List[Dict]:
        try:
            data, status = client.get_popular_movies(1)
            if status == http_status.HTTP_200_OK and 'results' in data:
                return [
                    mapper.map_search_item(
                        item, ContentType.MOVIE).to_dict()
                    for item in data['results'][:limit]
                    if item.get('media_type') != 'person'
                ]
        except Exception as e:
            print(f"Error fetching TMDB movies: {e}")
        return []

    def _fetch_tmdb_tv(self, client: TMDBClient, mapper: TMDBMapper, limit: int) -> List[Dict]:
        try:
            data, status = client.get_popular_tv(1)
            if status == http_status.HTTP_200_OK and 'results' in data:
                return [
                    mapper.map_search_item(
                        item, ContentType.TV_SHOW).to_dict()
                    for item in data['results'][:limit]
                    if item.get('media_type') != 'person'
                ]
        except Exception as e:
            print(f"Error fetching TMDB TV shows: {e}")
        return []

    def _fetch_igdb_games(self, client: IGDBClient, mapper: IGDBMapper, limit: int) -> List[Dict]:
        try:
            data, status = client.get_popular_games(limit, 0)
            if status == http_status.HTTP_200_OK and isinstance(data, list):
                return [mapper.map_search_item(item).to_dict() for item in data]
        except Exception as e:
            print(f"Error fetching IGDB games: {e}")
        return []

    def _fetch_spotify_albums(self, client: SpotifyClient, mapper: SpotifyMapper, limit: int, country: Optional[str]) -> List[Dict]:
        try:
            filtered_albums = []
            seen_ids = set()
            offset = 0
            max_per_request = 50

            while len(filtered_albums) < limit:
                request_limit = max_per_request if offset > 0 else limit

                data, status = client.get_new_releases(limit=request_limit, offset=offset)

                if status != http_status.HTTP_200_OK or 'albums' not in data:
                    break

                new_albums = data['albums'].get('items', [])
                if not new_albums:
                    break

                for album in new_albums:
                    if self._is_valid_spotify_album(album, seen_ids):
                        seen_ids.add(album['id'])
                        filtered_albums.append(
                            mapper.map_search_item(album).to_dict())
                        if len(filtered_albums) >= limit:
                            break

                if len(filtered_albums) >= limit:
                    break

                offset += len(new_albums)
                if len(new_albums) < request_limit:
                    break

            return filtered_albums[:limit]

        except Exception as e:
            print(f"Error fetching Spotify albums: {e}")
            return []

    def _is_valid_spotify_album(self, album: Dict, seen_ids: set) -> bool:
        if not album or not album.get('id'):
            return False
        if (album.get('album_type') or '').lower() == 'single':
            return False
        if album['id'] in seen_ids:
            return False
        return True

    def _fetch_openlibrary_books(self, client: OpenLibraryClient, mapper: OpenLibraryMapper, limit: int) -> List[Dict]:
        try:
            data, status = client.get_trending_books(limit)
            if status == http_status.HTTP_200_OK and 'docs' in data:
                return [mapper.map_search_item(doc).to_dict() for doc in data.get('docs', [])]
        except Exception as e:
            print(f"Error fetching OpenLibrary books: {e}")
        return []

    def _enrich_data(self, movies: List, tv: List, games: List, albums: List, books: List, country: Optional[str]) -> Tuple[List, List, List, List, List]:
        with ThreadPoolExecutor(max_workers=10) as executor:
            tmdb_movie_futures = self._launch_tmdb_enrichment(
                executor,
                self.clients.get('tmdb_mapper'),
                movies,
                'get_movie_complete',
                country
            )
            tmdb_tv_futures = self._launch_tmdb_enrichment(
                executor,
                self.clients.get('tmdb_mapper'),
                tv,
                'get_tv_show_complete',
                country
            )

            igdb_future = executor.submit(
                self._fetch_bulk_details,
                games,
                self.clients.get('igdb_client'),
                self.clients.get('igdb_mapper'),
                'get_bulk_games',
                'id',
                'id'
            )
            spotify_future = executor.submit(self._fetch_bulk_details,
                albums,
                self.clients.get('spotify_client'),
                self.clients.get('spotify_mapper'),
                'get_bulk_albums',
                'id',
                'id',
                'albums'
            )
            openlibrary_future = executor.submit(self._fetch_openlibrary_books_details,
                books,
                self.clients.get('openlibrary_client'),
                self.clients.get('openlibrary_mapper')
            )

            igdb_map = self._get_future_result_safe(igdb_future, {})
            spotify_map = self._get_future_result_safe(spotify_future, {})
            openlibrary_map = self._get_future_result_safe(openlibrary_future, {})

            movies = self._process_tmdb_enrichment(movies, tmdb_movie_futures)
            tv = self._process_tmdb_enrichment(tv, tmdb_tv_futures)
            games = self._apply_details_map(games, igdb_map)
            albums = self._apply_details_map(albums, spotify_map)
            books = self._apply_details_map(books, openlibrary_map)

        return movies, tv, games, albums, books

    def _launch_tmdb_enrichment(self, executor: ThreadPoolExecutor, mapper: Optional[TMDBMapper], items: List, mapper_method_name: str, country: Optional[str]) -> Dict:
        futures = {}
        if not mapper or not items:
            return futures

        try:
            mapper_method = getattr(mapper, mapper_method_name)
            for item in items:
                item_id = item.get('id')
                if item_id:
                    futures[item_id] = executor.submit(
                        mapper_method, int(item_id), country)
        except Exception as e:
            print(
                f"Error launching TMDB enrichment for {mapper_method_name}: {e}")
        return futures

    def _process_tmdb_enrichment(self, items: List, futures: Dict) -> List[Dict]:
        if not futures:
            return items

        enriched_items = list(items)
        for idx, item in enumerate(enriched_items):
            item_id = item.get('id')
            fut = futures.get(item_id)
            if not fut:
                continue
            try:
                detail_obj, status = fut.result()
                if status == http_status.HTTP_200_OK and detail_obj:
                    enriched_items[idx] = detail_obj.to_dict()
            except Exception as e:
                print(f"Error resolving TMDB detail for {item_id}: {e}")
        return enriched_items

    def _fetch_bulk_details(self, items: List, client: Optional[object], mapper: Optional[object], client_method_name: str, item_id_key: str, result_id_key: str, result_list_key: Optional[str] = None) -> Dict[str, Dict]:
        if not client or not mapper or not items:
            return {}

        ids = [item.get(item_id_key) for item in items if item.get(item_id_key)]
        if not ids:
            return {}

        try:
            client_method = getattr(client, client_method_name)
            data, status = client_method(ids)

            if status != http_status.HTTP_200_OK:
                return {}

            details_map = {}
            results_list = data.get(
                result_list_key) if result_list_key else data

            if not isinstance(results_list, list):
                return {}

            for item_data in results_list:
                item_id = item_data.get(result_id_key)
                if item_id:
                    details_map[str(item_id)] = mapper.map_detail(
                        item_data).to_dict()
            return details_map

        except Exception as e:
            print(f"Error fetching bulk details for {client_method_name}: {e}")
            return {}

    def _fetch_openlibrary_books_details(self, books: List, client: Optional[OpenLibraryClient], mapper: Optional[OpenLibraryMapper]) -> Dict[str, Dict]:
        if not client or not mapper or not books:
            return {}

        book_ids = [item.get('id') for item in books if item.get('id')]
        if not book_ids:
            return {}

        book_ids = [f"/works/{bid}" for bid in book_ids]

        try:
            data, status = client.get_bulk_books(book_ids)
            if status != http_status.HTTP_200_OK or not isinstance(data, list):
                return {}

            details_map = {}
            for entry in data:
                key = entry.get('key')
                book_data = entry.get('data')
                if not key or not book_data:
                    continue

                try:
                    bid = key.split('/')[-1]
                    details_map[bid] = mapper.map_detail(book_data).to_dict()
                except Exception:
                    continue
            return details_map

        except Exception as e:
            print(f"Error fetching OpenLibrary details: {e}")
            return {}

    def _apply_details_map(self, items: List, details_map: Dict) -> List[Dict]:
        if not details_map:
            return items

        enriched_items = list(items)
        for idx, item in enumerate(enriched_items):
            item_id = item.get('id')
            if item_id in details_map:
                enriched_items[idx] = details_map[item_id]
        return enriched_items

    def _format_response(self, movies: List, tv: List, games: List, albums: List, books: List) -> Dict[str, List]:
        try:
            final_albums = [item for item in albums if (
                item or {}).get('album_type') != 'single']
        except Exception:
            final_albums = albums

        return {
            'movies': movies,
            'tv_shows': tv,
            'games': games,
            'albums': final_albums,
            'books': books
        }
