from .base import IGDBBaseView
from .utils import normalize_search_item
from proxy.errors import build_error_response, get_http_status, MISSING_QUERY
from typing import Dict, Any, List

class GamesSearchView(IGDBBaseView):
    def filter_and_transform_results(self, data: Any, limit: int = 50, page: int = 1) -> Dict[str, Any]:
        if not isinstance(data, list):
            return data

        results = [normalize_search_item(item) for item in data]

        # Note: IGDB doesn't provide total count in response, so we estimate based on results
        # If we get exactly 'limit' results, there might be more pages
        has_more = len(results) == limit

        metadata = {
            'page': page,
            'page_results': len(results),
            'total_pages': page + 1 if has_more else page,
            'total_results': len(results) if not has_more else None  # Unknown total
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

        def transform_with_context(data):
            return self.filter_and_transform_results(data, limit=limit, page=page)

        return self.handle_api_call(
            client.search_games,
            transformer=transform_with_context,
            query=query,
            limit=limit,
            offset=offset
        )

