from rest_framework import permissions

class IsOwnerOfSharedList(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'list_type'):
            return (
                obj.list_type == 'SHARED' and
                obj.owner == request.user
            )

        return False
