from hmac import compare_digest

from django.conf import settings
from rest_framework import permissions


class IsAuthenticatedOrCatalogService(permissions.BasePermission):
    """Allow users or the trusted web catalog composition path."""

    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            return True

        expected_key = settings.PROXY_API_KEY
        provided_key = request.headers.get('X-Api-Key', '')
        consumer = request.headers.get('X-Api-Consumer', '')

        return (
            consumer == 'web'
            and bool(expected_key)
            and bool(provided_key)
            and compare_digest(provided_key, expected_key)
        )
