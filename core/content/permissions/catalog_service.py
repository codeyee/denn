from rest_framework import permissions

from core.catalog_service import is_trusted_catalog_service


class IsAuthenticatedOrCatalogService(permissions.BasePermission):
    """Allow users or the trusted web catalog composition path."""

    def has_permission(self, request, view):
        if request.user and request.user.is_authenticated:
            return True

        return is_trusted_catalog_service(request)
