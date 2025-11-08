from rest_framework import status as http_status, serializers
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from proxy.serializers.books import BookDetailSerializer
from proxy.serializers.common import ErrorResponseSerializer
from proxy.exceptions import MissingParameterException, InvalidParameterException
from ..base import OpenLibraryBaseView

class BookBulkView(OpenLibraryBaseView):
    @extend_schema(
        tags=['Proxy - Books'],
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
            raise MissingParameterException('keys')

        book_keys = [key.strip() for key in keys_param.split(',') if key.strip()]

        if not book_keys:
            raise InvalidParameterException('No valid book keys provided')

        if len(book_keys) > 50:
            raise InvalidParameterException('Maximum 50 book keys allowed per request')

        client = self.get_client()
        mapper = self.get_mapper()

        results, _ = client.get_bulk_books(book_keys)

        for result in results:
            if result['status_code'] == 200 and result['data']:
                result['data'] = mapper.map_detail(result['data']).to_dict()

        return Response(results, status=http_status.HTTP_200_OK)
