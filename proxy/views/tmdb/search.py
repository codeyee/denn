from rest_framework import status as http_status
from .base import TMDBBaseView
from .utils import normalize_search_item


class TMDBSearchView(TMDBBaseView):

    def filter_and_transform_results(self, data):
        if 'results' not in data: return data
        results = []

        for item in data['results']:
            if item.get('media_type') == 'person': continue
            results.append(normalize_search_item(item))

        metadata = {
            'page': data.get('page'),
            'page_results': len(results),
            'total_pages': data.get('total_pages'),
            'total_results': data.get('total_results')
        }

        return {'metadata': metadata, 'results': results}

    def get(self, request):
        query = request.query_params.get('query')

        if not query:
            error = {'error': 'MISSING_QUERY', 'message': 'Query parameter is required'}
            return self.transform_response(error, http_status.HTTP_400_BAD_REQUEST)

        page = int(request.query_params.get('page', 1))
        client = self.get_client()

        return self.handle_api_call(
            client.search,
            transformer=self.filter_and_transform_results,
            query=query,
            page=page
        )
