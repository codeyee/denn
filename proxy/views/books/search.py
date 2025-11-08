from rest_framework.response import Response
from rest_framework import status as http_status
from proxy.views.base import OpenLibraryBaseView
from proxy.exceptions import MissingParameterException
from proxy.serializers.books import BookSearchResponseSerializer
from proxy.serializers.common import ErrorResponseSerializer
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

class BookSearchView(OpenLibraryBaseView):

    @extend_schema(
        tags=['Proxy - Books'],
        summary='Search books',
        description='Search for books by title, author, or ISBN using OpenLibrary.',
        parameters=[
            OpenApiParameter('query', OpenApiTypes.STR, required=True, description='Search query (title, author, or ISBN)'),
            OpenApiParameter('limit', OpenApiTypes.INT, description='Results per page (default: 50)'),
            OpenApiParameter('page', OpenApiTypes.INT, description='Page number (default: 1)')
        ],
        responses={
            200: BookSearchResponseSerializer,
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        query = request.query_params.get('query')
        if not query:
            raise MissingParameterException('query')

        page = int(request.query_params.get('page', 1))
        limit = int(request.query_params.get('limit', 50))

        client = self.get_client()
        mapper = self.get_mapper()

        data, status_code = client.search(query=query, page=page, limit=limit)

        if status_code != http_status.HTTP_200_OK:
            return Response(data, status=status_code)

        if 'docs' not in data:
            return Response(data, status=status_code)

        results = [mapper.map_search_item(item).to_dict() for item in data['docs']]

        num_found = data.get('numFound', 0)
        offset = data.get('offset', 0)

        current_page = (offset // limit) + 1 if limit > 0 else 1
        total_pages = (num_found // limit) + (1 if num_found % limit > 0 else 0) if limit > 0 else 1

        metadata = {
            'page': current_page,
            'page_results': len(results),
            'total_pages': total_pages,
            'total_results': num_found,
        }

        return Response({'metadata': metadata, 'results': results}, status=http_status.HTTP_200_OK)
