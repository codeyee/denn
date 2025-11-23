from rest_framework import status as http_status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from proxy.serializers.books import BookDetailSerializer
from proxy.serializers.common import ErrorResponseSerializer
from core.exceptions import MissingParameterException, InvalidParameterException
from ..base import OpenLibraryBaseView

class BookBulkView(OpenLibraryBaseView):

    def _validate_ids(self, request):
        ids_param = request.query_params.get('ids', '')
        if not ids_param:
            raise MissingParameterException('ids')

        return ids_param

    def _validate_book_ids(self, ids_param):
        book_ids = [id.strip() for id in ids_param.split(',') if id.strip()]

        if not book_ids:
            raise InvalidParameterException('No valid book IDs provided')

        return book_ids

    def _validate_max_ids(self, book_ids):
        if len(book_ids) > 50:
            raise InvalidParameterException('Maximum 50 book IDs allowed per request')

        return book_ids

    @extend_schema(
        tags=['Proxy - Books'],
        summary='Bulk get book details',
        description='''
        Retrieve detailed information about multiple books from OpenLibrary in a single request. Returns a list of book details. Use OpenLibrary work IDs (e.g., "OL28346580W").

        **Dynamic Field Selection:**
        Use the `fields` parameter to optimize the response by selecting only the fields you need.

        **Examples:**
        - `?ids=OL28346580W,OL45883W&fields=id,title,author_name` - Get basic info for multiple books
        - `?ids=OL28346580W,OL45883W&fields=id,title,cover.url` - Include cover URLs
        ''',
        parameters=[
            OpenApiParameter(
                'ids',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=True,
                description='Comma-separated list of OpenLibrary work IDs (e.g., "OL28346580W,OL45883W,OL82563W")'
            ),
            OpenApiParameter(
                'fields',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=False,
                description='Comma-separated list of fields to include. Supports dot notation for nested fields (e.g., "id,title,cover.url")'
            )
        ],
        responses={
            200: BookDetailSerializer(many=True),
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        ids_param = self._validate_ids(request)
        book_ids = self._validate_book_ids(ids_param)
        book_ids = self._validate_max_ids(book_ids)

        client = self.get_client()
        mapper = self.get_mapper()

        results, _ = client.get_bulk_books(book_ids)

        books = []
        for result in results:
            if result['status_code'] == 200 and result['data']:
                books.append(mapper.map_detail(result['data']).to_dict())

        books = self.apply_dynamic_fields(books, request)
        return Response(books, status=http_status.HTTP_200_OK)
