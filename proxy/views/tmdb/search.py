from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status as http_status
from proxy.clients.tmdb import TMDBClient
from django.conf import settings
from rest_framework import status

class TMDBSearchView(APIView):

    def filter_and_transform_results(self, data):
        if 'results' not in data: return data
        results = []

        for item in data['results']:
            if item.get('media_type') == 'person': continue

            poster_path = item.get('poster_path')
            backdrop_path = item.get('backdrop_path')

            poster_url = f'{settings.PROXY_API["TMDB"]["IMAGES_BASE_URL"]}{poster_path}' if poster_path else None
            backdrop_url = f'{settings.PROXY_API["TMDB"]["BACKDROP_BASE_URL"]}{backdrop_path}' if backdrop_path else None

            transformed_item = {
                'id': item.get('id'),
                'type': item.get('media_type'),
                'title': item.get('title') or item.get('name'),
                'original_title': item.get('original_title') or item.get('original_name'),
                'original_language': item.get('original_language'),
                'description': item.get('overview'),
                'poster_url': poster_url,
                'backdrop_url': backdrop_url,
                'release_date': item.get('release_date') or item.get('first_air_date'),
            }

            results.append(transformed_item)

        metadata = {
            'page': data.get('page'),
            'page_results': len(results),
            'total_pages': data.get('total_pages'),
            'total_results': data.get('total_results')
        }

        return { 'metadata': metadata, 'results': results }

    def get(self, request):
        query = request.query_params.get('query')

        if not query:
            error = { 'error': 'MISSING_QUERY', 'message': 'Query parameter is required' }
            return Response(error, status=http_status.HTTP_400_BAD_REQUEST)

        client = TMDBClient()

        page = int(request.query_params.get('page', 1))
        data, status_code = client.search(query=query, page=page)

        if status_code == http_status.HTTP_200_OK:
            data = self.filter_and_transform_results(data)

        return Response(data, status=status_code)

