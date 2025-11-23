from rest_framework.response import Response
from rest_framework import status as http_status
from proxy.views.base import OpenLibraryBaseView
from core.exceptions import MissingParameterException, InvalidParameterException
from proxy.serializers.books import BookSearchResponseSerializer
from proxy.serializers.common import ErrorResponseSerializer
from core.pagination import build_pagination_metadata
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class BookSearchView(OpenLibraryBaseView):

    def _validate_query(self, request):
        query = request.query_params.get('query')
        if not query:
            raise MissingParameterException('query is required')

        return query

    def _validate_page_size(self, request):
        page_size = int(request.query_params.get('page_size', 20))
        if page_size < 1 or page_size > 50:
            raise InvalidParameterException('page_size must be between 1 and 50')

        return page_size

    def _validate_page(self, request):
        page = int(request.query_params.get('page', 1))
        if page < 1:
            raise InvalidParameterException('page must be greater than or equal to 1')

        return page

    @extend_schema(
        tags=['Proxy - Books'],
        summary='Search books',
        description='''
        Search for books by title, author, or ISBN using OpenLibrary.

        **Dynamic Field Selection:**
        Use the `fields` parameter to select specific fields and reduce response payload size.
        Supports dot notation for nested fields.

        **Examples:**
        - `?fields=id,title,author_name` - Return only basic info
        - `?fields=id,title,cover.url` - Include nested cover URL
        - `?fields=id,title,author_name,publish_year` - Get specific fields only
        ''',
        parameters=[
            OpenApiParameter('query', OpenApiTypes.STR, required=True, description='Search query (title, author, or ISBN)'),
            OpenApiParameter('page_size', OpenApiTypes.INT, description='Results per page (1-50, default: 20)'),
            OpenApiParameter('page', OpenApiTypes.INT, description='Page number (default: 1)'),
            OpenApiParameter('fields', OpenApiTypes.STR, required=False, description='Comma-separated list of fields to include. Supports dot notation for nested fields (e.g., "id,title,cover.url")')
        ],
        responses={
            200: BookSearchResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        query = self._validate_query(request)
        page = self._validate_page(request)
        page_size = self._validate_page_size(request)

        client = self.get_client()
        mapper = self.get_mapper()

        data, status_code = client.search(query=query, page=page, limit=page_size)

        if status_code != http_status.HTTP_200_OK:
            return Response(data, status=status_code)

        if 'docs' not in data:
            return Response(data, status=status_code)

        results = [mapper.map_search_item(item).to_dict() for item in data['docs']]

        # Apply dynamic fields to the results list
        results = self.apply_dynamic_fields(results, request)

        metadata = build_pagination_metadata(
            request=request,
            current_page=page,
            page_size=page_size,
            total_results=data.get('numFound', 0),
            results_count=len(results)
        )

        return Response({'metadata': metadata, 'results': results}, status=http_status.HTTP_200_OK)
