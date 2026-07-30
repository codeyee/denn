from rest_framework import permissions
from content.services.list_policy import ListAction, can

class IsOwnerOrReadOnly(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return can(obj, request.user, ListAction.VIEW)

        return can(obj, request.user, ListAction.MANAGE_SETTINGS)
