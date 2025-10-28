from rest_framework import permissions

class IsMemberOfList(permissions.BasePermission):
    def has_permission(self, request, view):
        list_pk = view.kwargs.get('list_pk')

        if not list_pk: return False

        from content.models import UserList
        try:
            user_list = UserList.objects.get(pk=list_pk)

            if hasattr(user_list, 'owner') and user_list.owner == request.user:
                return True

            return user_list.members.filter(id=request.user.id).exists()
        except UserList.DoesNotExist:
            return False

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'members'):
            has_owner = hasattr(obj, 'owner')
            user_is_owner = has_owner and obj.owner == request.user

            if user_is_owner: return True
            return obj.members.filter(id=request.user.id).exists()

        if hasattr(obj, 'user_list'):
            has_owner = hasattr(obj.user_list, 'owner')
            user_is_owner = has_owner and obj.user_list.owner == request.user

            if user_is_owner: return True
            return obj.user_list.members.filter(id=request.user.id).exists()

        return False
