import re
from hmac import compare_digest

from django.conf import settings


CATALOG_VISITOR_PATTERN = re.compile(r'^[0-9a-f]{64}$')


def is_trusted_catalog_service(request):
    expected_key = settings.PROXY_API_KEY
    provided_key = request.headers.get('X-Api-Key', '')
    consumer = request.headers.get('X-Api-Consumer', '')

    return (
        consumer == 'web'
        and bool(expected_key)
        and bool(provided_key)
        and compare_digest(provided_key, expected_key)
    )


def get_trusted_catalog_visitor(request):
    if not is_trusted_catalog_service(request):
        return None

    visitor = request.headers.get('X-Catalog-Visitor', '').strip().lower()
    return visitor if CATALOG_VISITOR_PATTERN.fullmatch(visitor) else None
