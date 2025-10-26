from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from collections import OrderedDict

class CustomPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100

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

