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
        description='Retrieve detailed information about a specific book from OpenLibrary using the work key.',
        parameters=[
            OpenApiParameter('book_id', OpenApiTypes.STR, OpenApiParameter.PATH, required=True, description='OpenLibrary work key (e.g., "OL82563W")')
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
            return Response(book.to_dict(), status=http_status.HTTP_200_OK)

        raise NotFoundException('Book')
