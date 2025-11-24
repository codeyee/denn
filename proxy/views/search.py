from concurrent.futures import ThreadPoolExecutor
from typing import Dict, List, Optional
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from rest_framework.permissions import AllowAny
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from proxy.clients.tmdb import TMDBClient
from proxy.clients.igdb import IGDBClient
from proxy.clients.spotify import SpotifyClient
from proxy.clients.openlibrary import OpenLibraryClient

from proxy.mappers.tmdb import TMDBMapper
from proxy.mappers.igdb import IGDBMapper
from proxy.mappers.spotify import SpotifyMapper
from proxy.mappers.openlibrary import OpenLibraryMapper

from proxy.constants.common import ContentType
from core.exceptions import InvalidParameterException, MissingParameterException
from proxy.utils import filter_unreleased_content


class MultiSearchView(APIView):
    """
    Multi-search endpoint that searches across all content types in parallel.
    """
    permission_classes = [AllowAny]

    # Map of content type strings to their respective clients and mappers
    CONTENT_TYPE_HANDLERS = {
        'MOVIES': {
            'client_class': TMDBClient,
            'mapper_class': TMDBMapper,
            'search_method': 'search_movies',
            'content_type': ContentType.MOVIE
        },
        'TV_SHOWS': {
            'client_class': TMDBClient,
            'mapper_class': TMDBMapper,
            'search_method': 'search_tv_shows',
            'content_type': ContentType.TV_SHOW
        },
        'GAMES': {
            'client_class': IGDBClient,
            'mapper_class': IGDBMapper,
            'search_method': 'search_games',
            'content_type': ContentType.GAME
        },
        'ALBUMS': {
            'client_class': SpotifyClient,
            'mapper_class': SpotifyMapper,
            'search_method': 'search',
            'content_type': ContentType.ALBUM
        },
        'BOOKS': {
            'client_class': OpenLibraryClient,
            'mapper_class': OpenLibraryMapper,
            'search_method': 'search',
            'content_type': ContentType.BOOK
        }
    }

    ALL_CONTENT_TYPES = ['MOVIES', 'TV_SHOWS', 'GAMES', 'ALBUMS', 'BOOKS']

    @extend_schema(
        summary="Multi-content search",
        description="Search across multiple content types (movies, TV shows, games, albums, books) in parallel",
        parameters=[
            OpenApiParameter(
                name='query',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Search query string'
            ),
            OpenApiParameter(
                name='types',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Comma-separated list of content types to search. Options: MOVIES, TV_SHOWS, GAMES, ALBUMS, BOOKS. If not specified, searches all types.'
            ),
            OpenApiParameter(
                name='limit',
                type=OpenApiTypes.INT,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Maximum number of results per content type (default: 20)'
            ),
            OpenApiParameter(
                name='include_unreleased',
                type=OpenApiTypes.BOOL,
                location=OpenApiParameter.QUERY,
                required=False,
                description='Include unreleased content (default: false)'
            ),
        ],
        responses={
            200: {
                'description': 'Search results grouped by content type',
                'example': {
                    'movies': [],
                    'tv_shows': [],
                    'games': [],
                    'music': [],
                    'books': []
                }
            },
            400: {'description': 'Invalid parameters'}
        }
    )
    def get(self, request):
        """
        Search across multiple content types in parallel.

        Query Parameters:
            - query (required): Search query string
            - types (optional): Comma-separated content types (e.g., "MOVIES,TV_SHOWS,GAMES")
            - limit (optional): Limit per type (default: 20)
        """
        # Get query parameter
        query = request.query_params.get('query')
        if not query:
            raise MissingParameterException('query')

        # Get content types to search
        types_param = request.query_params.get('types', '')
        if types_param:
            requested_types = [t.strip().upper() for t in types_param.split(',')]
            # Validate types
            invalid_types = [t for t in requested_types if t not in self.ALL_CONTENT_TYPES]
            if invalid_types:
                raise InvalidParameterException(
                    f"Invalid content type(s): {', '.join(invalid_types)}. "
                    f"Valid types are: {', '.join(self.ALL_CONTENT_TYPES)}"
                )
            content_types = requested_types
        else:
            content_types = self.ALL_CONTENT_TYPES

        # Get limit parameter
        try:
            limit = int(request.query_params.get('limit', 20))
            if limit < 1 or limit > 100:
                raise InvalidParameterException('Limit must be between 1 and 100')
        except ValueError:
            raise InvalidParameterException('Limit must be a valid integer')

        # Get include_unreleased parameter
        include_unreleased = request.query_params.get('include_unreleased', 'false').lower() == 'true'

        # Perform parallel searches
        results = self._search_parallel(query, content_types, limit, include_unreleased)

        # Return results in consistent format matching homepage
        return Response({
            'movies': results.get('MOVIES', []),
            'tv_shows': results.get('TV_SHOWS', []),
            'games': results.get('GAMES', []),
            'music': results.get('ALBUMS', []),
            'books': results.get('BOOKS', [])
        }, status=http_status.HTTP_200_OK)

    def _search_parallel(self, query: str, content_types: List[str], limit: int, include_unreleased: bool) -> Dict[str, List]:
        """
        Execute searches in parallel using ThreadPoolExecutor.
        """
        results = {}

        with ThreadPoolExecutor(max_workers=5) as executor:
            futures = {}

            for content_type in content_types:
                handler = self.CONTENT_TYPE_HANDLERS.get(content_type)
                if handler:
                    futures[content_type] = executor.submit(
                        self._search_content_type,
                        content_type,
                        query,
                        limit,
                        include_unreleased
                    )

            # Collect results
            for content_type, future in futures.items():
                results[content_type] = self._get_future_result(future, content_type)

        return results

    def _search_content_type(self, content_type: str, query: str, limit: int, include_unreleased: bool) -> List[Dict]:
        """
        Search a specific content type.
        """
        handler = self.CONTENT_TYPE_HANDLERS.get(content_type)
        if not handler:
            return []

        try:
            # Initialize client and mapper
            client = handler['client_class']()
            mapper = handler['mapper_class'](client)

            # Perform search based on content type
            if content_type == 'MOVIES':
                data, status = client.search_movies(query, page=1)
            elif content_type == 'TV_SHOWS':
                data, status = client.search_tv_shows(query, page=1)
            elif content_type == 'GAMES':
                data, status = client.search_games(query, limit=limit, offset=0)
            elif content_type == 'ALBUMS':
                data, status = client.search(query, search_type='album', limit=limit, offset=0)
            elif content_type == 'BOOKS':
                data, status = client.search(query, page=1, limit=limit)
            else:
                return []

            if status != http_status.HTTP_200_OK:
                return []

            # Map results
            mapped_results = self._map_search_results(data, mapper, handler['content_type'], limit)

            # Filter unreleased content
            return filter_unreleased_content(mapped_results, include_unreleased)

        except Exception as e:
            print(f"Error searching {content_type}: {e}")
            return []

    def _map_search_results(self, data: Dict, mapper, content_type: ContentType, limit: int) -> List[Dict]:
        """
        Map API response to standardized format.
        """
        try:
            # Extract results array from response
            if content_type == ContentType.GAME:
                results = data if isinstance(data, list) else []
            elif content_type == ContentType.ALBUM:
                results = data.get('albums', {}).get('items', [])
            elif content_type == ContentType.BOOK:
                results = data.get('docs', [])
            else:  # TMDB (movies, TV shows)
                results = data.get('results', [])

            # Map each result
            mapped_results = []
            for item in results[:limit]:
                # Skip person entries in TMDB results
                if item.get('media_type') == 'person':
                    continue

                try:
                    mapped_item = mapper.map_search_item(item, content_type)
                    mapped_results.append(mapped_item.to_dict())
                except Exception as e:
                    print(f"Error mapping item: {e}")
                    continue

            return mapped_results

        except Exception as e:
            print(f"Error mapping search results: {e}")
            return []

    def _get_future_result(self, future, content_type: str) -> List:
        """
        Safely get result from a future, handling exceptions.
        """
        try:
            return future.result() if future else []
        except Exception as e:
            print(f"Error resolving future for {content_type}: {e}")
            return []
