from rest_framework.response import Response
from rest_framework import status as http_status
from ..base import OpenLibraryBaseView
from core.exceptions import NotFoundException
from proxy.serializers.books import BookDetailSerializer
from proxy.serializers.common import ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes


class BookDetailView(OpenLibraryBaseView):
    @extend_schema(
        tags=['Proxy - Books'],
        summary='Get book details',
        description='''
        Retrieve detailed information about a specific book from OpenLibrary using the work key.

        **Dynamic Field Selection:**
        Use the `fields` parameter to select specific fields and reduce response payload size.
        Supports dot notation for nested fields.

        **Examples:**
        - `?fields=id,title,author_name` - Return only basic book info
        - `?fields=id,title,cover.url,author_name` - Get specific fields with cover
        - `?fields=id,title,description,publish_year` - Get selected fields only
        ''',
        parameters=[
            OpenApiParameter('book_id', OpenApiTypes.STR, OpenApiParameter.PATH, required=True, description='OpenLibrary work key (e.g., "OL82563W")'),
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include. Supports dot notation for nested fields (e.g., "id,title,cover.url")')
        ],
        responses={
            200: BookDetailSerializer,
            404: ErrorResponseSerializer
        }
    )
    def get(self, request, book_id: str):
        client = self.get_client()
        mapper = self.get_mapper()

        data, status_code = client.search_by_key(key=book_id)

        if status_code != http_status.HTTP_200_OK:
            if status_code == http_status.HTTP_404_NOT_FOUND:
                raise NotFoundException('Book')
            return Response(data, status=status_code)

        if 'docs' in data and len(data['docs']) > 0:
            book = mapper.map_detail(data['docs'][0])
            book_dict = book.to_dict()
            book_dict = self.apply_dynamic_fields(book_dict, request)
            return Response(book_dict, status=http_status.HTTP_200_OK)

        raise NotFoundException('Book')
