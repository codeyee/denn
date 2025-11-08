from rest_framework import status as http_status, serializers
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from proxy.serializers.books import BookDetailSerializer
from proxy.serializers.common import ErrorResponseSerializer
from proxy.exceptions import MissingParameterError
from ..base import OpenLibraryBaseView

class BookBulkView(OpenLibraryBaseView):
    @extend_schema(
        tags=['Books'],
        summary='Bulk get book details',
        description='Retrieve detailed information about multiple books from OpenLibrary in a single request. Returns a list of results with key, data, status_code, and error fields. Use OpenLibrary work keys (e.g., "OL28346580W").',
        parameters=[
            OpenApiParameter(
                'keys',
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                required=True,
                description='Comma-separated list of OpenLibrary work keys (e.g., "OL28346580W,OL45883W,OL82563W")'
            )
        ],
        responses={
            200: serializers.ListSerializer(child=serializers.DictField()),
            400: ErrorResponseSerializer
        }
    )
    def get(self, request):
        keys_param = request.query_params.get('keys', '')
        if not keys_param:
            raise MissingParameterError('keys')

        book_keys = [key.strip() for key in keys_param.split(',') if key.strip()]

        if not book_keys:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'No valid book keys provided'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        if len(book_keys) > 50:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'Maximum 50 book keys allowed per request'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

        client = self.get_client()
        mapper = self.get_mapper()

        results, _ = client.get_bulk_books(book_keys)

        for result in results:
            if result['status_code'] == 200 and result['data']:
                result['data'] = mapper.map_detail(result['data']).to_dict()

        return Response(results, status=http_status.HTTP_200_OK)
