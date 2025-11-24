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
        Retrieve detailed information about a specific book from OpenLibrary.

        **Dynamic Field Selection:**
        Use the `fields` parameter to select specific fields and reduce response payload size.
        Supports dot notation for nested fields.
        
        **Image Size Limiting:**
        - `images_size` - Limit the number of images returned in image lists.

        **Examples:**
        - `?fields=id,title,description` - Return only basic info
        - `?fields=id,title,cover.url` - Include cover image
        - `?images_size=4` - Limit images to 4 per list
        ''',
        parameters=[
            OpenApiParameter('book_id', OpenApiTypes.STR, OpenApiParameter.PATH, required=True, description='OpenLibrary work ID'),
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include. Supports dot notation for nested fields (e.g., "id,title,cover.url")'),
            OpenApiParameter('images_size', OpenApiTypes.INT, OpenApiParameter.QUERY, required=False, description='Maximum number of images to return in the images list (default: 18)')
        ],
        responses={
            200: BookDetailSerializer,
            404: ErrorResponseSerializer
        }
    )
    def get(self, request, book_id: str):
        client = self.get_client()
        mapper = self.get_mapper()
        images_size = int(request.query_params.get('images_size', 18))

        data, status_code = client.get_book_by_key(book_id=book_id)

        if status_code != http_status.HTTP_200_OK:
            if status_code == http_status.HTTP_404_NOT_FOUND:
                raise NotFoundException('Book')
            return Response(data, status=status_code)

        if not data:
            raise NotFoundException('Book')

        book = mapper.map_detail(data)
        book_dict = book.to_dict(images_size=images_size)
        book_dict = self.apply_dynamic_fields(book_dict, request)
        return Response(book_dict, status=http_status.HTTP_200_OK)
