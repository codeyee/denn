from .base import IGDBBaseView
from .utils import normalize_search_item
from proxy.errors import build_error_response, get_http_status, MISSING_QUERY
from typing import Dict, Any, List

class GamesSearchView(IGDBBaseView):
    def filter_and_transform_results(self, data: Any) -> Dict[str, Any]:
        if not isinstance(data, list):
            return data

        results = [normalize_search_item(item) for item in data]

        metadata = {
            'total_results': len(results)
        }

        return {'metadata': metadata, 'results': results}

    def get(self, request):
        query = request.query_params.get('query')

        if not query:
            error_response = build_error_response(MISSING_QUERY)
            return self.transform_response(error_response, get_http_status(MISSING_QUERY))

        limit = int(request.query_params.get('limit', 50))
        page = int(request.query_params.get('page', 1))
        offset = (page - 1) * limit

        client = self.get_client()
        return self.handle_api_call(
            client.search_games,
            transformer=self.filter_and_transform_results,
            query=query,
            limit=limit,
            offset=offset
        )

