from rest_framework import permissions
from content.services.list_policy import ListAction, can

class IsOwnerOfSharedList(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        return hasattr(obj, 'list_type') and can(
            obj,
            request.user,
            ListAction.MANAGE_MEMBERS,
        )
