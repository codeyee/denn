from rest_framework import status as http_status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiExample
from drf_spectacular.types import OpenApiTypes
from .base import OpenLibraryBaseView
from .utils import normalize_search_item

class BookBulkView(OpenLibraryBaseView):
    @extend_schema(
        tags=['Proxy - Books'],
        summary='Bulk get book details',
        description='Retrieve detailed information about multiple books from OpenLibrary in a single request. Use OpenLibrary work keys (e.g., "OL28346580W").',
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
            200: OpenApiExample(
                'Bulk Book Details',
                value=[
                    {
                        'key': 'OL28346580W',
                        'data': {
                            'id': 'OL28346580W',
                            'title': 'Chainsaw Man, Vol. 1',
                            'authors': ['Tatsuki Fujimoto'],
                            'image_url': 'https://covers.openlibrary.org/b/id/10401782-L.jpg',
                            'release_date': '2020',
                            'pages': 192,
                            'description': "Denji's a poor young man who'll do anything for a bit of cash..."
                        },
                        'status_code': 200,
                        'error': None
                    }
                ]
            ),
            400: OpenApiExample(
                'Bad Request',
                value={'error': 'INVALID_REQUEST', 'message': 'Missing or invalid keys parameter'}
            )
        }
    )
    def get(self, request):
        keys_param = request.query_params.get('keys', '')

        if not keys_param:
            return Response(
                {'error': 'INVALID_REQUEST', 'message': 'Missing keys parameter'},
                status=http_status.HTTP_400_BAD_REQUEST
            )

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
        results, _ = client.get_bulk_books(book_keys)

        for result in results:
            if result['status_code'] == 200 and result['data']:
                result['data'] = normalize_search_item(result['data'])

        return Response(results, status=http_status.HTTP_200_OK)
