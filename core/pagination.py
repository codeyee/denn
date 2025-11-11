from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from collections import OrderedDict
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class CustomPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

    def paginate_queryset(self, queryset, request, view=None):
        raw_page_size = request.query_params.get(self.page_size_query_param)

        # If page_size is explicitly set to "0", bypass pagination and return all items
        if raw_page_size is not None and str(raw_page_size).strip() == "0":
            # Count total items in queryset
            total_count = queryset.count() if hasattr(queryset, 'count') else len(queryset)

            # Log warning for large lists
            if total_count > 200:
                logger.warning(
                    f"Fetching all {total_count} items without pagination "
                    f"(requested by {request.user if hasattr(request, 'user') else 'unknown'} "
                    f"on {request.path})"
                )

            # Return None to signal DRF to skip pagination
            # The view will handle the full queryset directly
            return None

        # Otherwise, use standard pagination
        return super().paginate_queryset(queryset, request, view)

    def get_paginated_response(self, data):
        return Response(OrderedDict([
            ('metadata', OrderedDict([
                ('count', self.page.paginator.count),
                ('page_size', self.page.paginator.per_page),
                ('current_page', self.page.number),
                ('total_pages', self.page.paginator.num_pages),
                ('next', self.get_next_link()),
                ('previous', self.get_previous_link()),
            ])),
            ('results', data)
        ]))

    def get_paginated_response_schema(self, schema):
        return {
            'type': 'object',
            'properties': {
                'metadata': {
                    'type': 'object',
                    'properties': {
                        'count': {
                            'type': 'integer',
                            'example': 123,
                            'description': 'Total number of items across all pages'
                        },
                        'page_size': {
                            'type': 'integer',
                            'example': 20,
                            'description': 'Number of items per page'
                        },
                        'current_page': {
                            'type': 'integer',
                            'example': 1,
                            'description': 'Current page number (1-indexed)'
                        },
                        'total_pages': {
                            'type': 'integer',
                            'example': 7,
                            'description': 'Total number of pages'
                        },
                        'next': {
                            'type': 'string',
                            'nullable': True,
                            'format': 'uri',
                            'example': 'http://api.example.org/accounts/?page=2',
                            'description': 'URL to the next page (null if on last page)'
                        },
                        'previous': {
                            'type': 'string',
                            'nullable': True,
                            'format': 'uri',
                            'example': 'http://api.example.org/accounts/?page=1',
                            'description': 'URL to the previous page (null if on first page)'
                        },
                    },
                    'required': ['count', 'page_size', 'current_page', 'total_pages', 'next', 'previous']
                },
                'results': schema,
            },
            'required': ['metadata', 'results']
        }


def build_pagination_metadata(
    request,
    current_page: int,
    page_size: int,
    total_results: Optional[int] = None,
    results_count: Optional[int] = None,
) -> OrderedDict:
    metadata = OrderedDict()

    metadata['count'] = total_results
    metadata['page_size'] = page_size
    metadata['current_page'] = current_page

    if total_results is not None:
        metadata['total_pages'] = (total_results + page_size - 1) // page_size if page_size > 0 else 1
    else:
        # For APIs that don't provide totals, estimate based on results
        if results_count is not None and results_count < page_size:
            # Last page (didn't get full page of results)
            metadata['total_pages'] = current_page
        else:
            # Unknown, but there might be more pages
            metadata['total_pages'] = current_page + 1

    metadata['next'] = _get_next_page(request, current_page, page_size, total_results, results_count)
    metadata['previous'] = _get_previous_page(request, current_page, page_size)

    return metadata


def _get_next_page(request, current_page, page_size, total_results, results_count):
    if _has_next_page(current_page, page_size, total_results, results_count):
        return _build_page_url(request, current_page + 1, page_size)
    else:
        return None


def _get_previous_page(request, current_page, page_size):
    if current_page > 1:
        return _build_page_url(request, current_page - 1, page_size)
    else:
        return None


def _has_next_page(
    current_page: int,
    page_size: int,
    total_results: Optional[int],
    results_count: Optional[int]
) -> bool:
    if total_results is not None:
        # We know the total, calculate definitively
        total_pages = (total_results + page_size - 1) // page_size if page_size > 0 else 1
        return current_page < total_pages
    elif results_count is not None:
        # No total, but we can check if current page is full
        # If we got a full page, there might be more
        return results_count == page_size
    else:
        # No information, assume no next page
        return False


def _build_page_url(request, page_number: int, page_size: int) -> str:
    url = request.build_absolute_uri()

    parsed_url = urlparse(url)
    query_params = parse_qs(parsed_url.query, keep_blank_values=True)

    query_params['page'] = [str(page_number)]
    query_params['page_size'] = [str(page_size)]

    new_query = urlencode(
        {k: v[0] if isinstance(v, list) and len(v) == 1 else v for k, v in query_params.items()},
        doseq=True
    )

    new_url = urlunparse((
        parsed_url.scheme,
        parsed_url.netloc,
        parsed_url.path,
        parsed_url.params,
        new_query,
        parsed_url.fragment
    ))

    return new_url
