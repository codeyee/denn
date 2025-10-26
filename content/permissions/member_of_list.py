from rest_framework import permissions

class IsMemberOfList(permissions.BasePermission):
    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'members'):
            return obj.members.filter(id=request.user.id).exists()

        if hasattr(obj, 'user_list'):
            return obj.user_list.members.filter(id=request.user.id).exists()

        return False
