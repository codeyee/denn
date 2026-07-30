from enum import Enum

from django.db.models import F, Q

from content.models import ListMembership, UserList


class ListAction(str, Enum):
    VIEW = "view"
    EDIT_CONTENT = "edit_content"
    REORDER = "reorder"
    MANAGE_SETTINGS = "manage_settings"
    MANAGE_MEMBERS = "manage_members"
    INVITE = "invite"
    CHANGE_ROLE = "change_role"
    DELETE = "delete"


EDITABLE_ROLES = (
    ListMembership.Role.OWNER,
    ListMembership.Role.EDITOR,
)
ALL_MEMBER_ROLES = (
    ListMembership.Role.OWNER,
    ListMembership.Role.EDITOR,
    ListMembership.Role.VIEWER,
)


def is_collaborative(user_list: UserList) -> bool:
    return user_list.list_type == UserList.ListType.SHARED


def get_membership(user_list: UserList, user):
    if not user or not user.is_authenticated:
        return None
    if user_list.owner_id == user.id:
        return ListMembership(
            user_list=user_list,
            user=user,
            role=ListMembership.Role.OWNER,
        )
    if not is_collaborative(user_list):
        return None

    prefetched = _cached_memberships(user_list)
    if prefetched is not None:
        return next(
            (membership for membership in prefetched if membership.user_id == user.id),
            None,
        )

    return (
        user_list.memberships.select_related("user")
        .filter(user_id=user.id)
        .first()
    )


def get_role(user_list: UserList, user):
    membership = get_membership(user_list, user)
    return membership.role if membership else None


def effective_memberships(user_list: UserList):
    """Return memberships that are effective under the list type contract."""
    prefetched = _cached_memberships(user_list)
    if prefetched is not None:
        if user_list.list_type == UserList.ListType.DYNAMIC:
            return []
        if is_collaborative(user_list):
            return [
                membership
                for membership in prefetched
                if membership.role in ALL_MEMBER_ROLES
            ]
        return [
            membership
            for membership in prefetched
            if membership.user_id == user_list.owner_id
            and membership.role == ListMembership.Role.OWNER
        ]

    queryset = user_list.memberships.select_related("user")
    if user_list.list_type == UserList.ListType.DYNAMIC:
        return queryset.none()
    if is_collaborative(user_list):
        return queryset.filter(role__in=ALL_MEMBER_ROLES)
    return queryset.filter(
        user_id=user_list.owner_id,
        role=ListMembership.Role.OWNER,
    )


def _cached_memberships(user_list: UserList):
    """Read either a to_attr prefetch or Django's related-manager cache."""
    memberships_prefetched = getattr(user_list, "memberships_prefetched", None)
    if memberships_prefetched is not None:
        return memberships_prefetched
    return getattr(user_list, "_prefetched_objects_cache", {}).get("memberships")


def effective_membership_count_filter():
    return Q(
        list_type=UserList.ListType.SHARED,
        memberships__role__in=ALL_MEMBER_ROLES,
    ) | Q(
        list_type=UserList.ListType.PERSONAL,
        memberships__user_id=F("owner_id"),
        memberships__role=ListMembership.Role.OWNER,
    )


def can(user_list: UserList, user, action: ListAction) -> bool:
    if action == ListAction.VIEW and (
        not user or not user.is_authenticated
    ):
        return (
            user_list.visibility == UserList.Visibility.PUBLIC
            and user_list.list_type != UserList.ListType.DYNAMIC
        )

    role = get_role(user_list, user)
    if role is None:
        return False

    if user_list.list_type == UserList.ListType.DYNAMIC:
        return (
            role == ListMembership.Role.OWNER
            and action in {
                ListAction.VIEW,
                ListAction.REORDER,
                ListAction.MANAGE_SETTINGS,
                ListAction.DELETE,
            }
        )

    if action == ListAction.VIEW:
        return role in ALL_MEMBER_ROLES
    if action in {
        ListAction.EDIT_CONTENT,
        ListAction.REORDER,
    }:
        return role in EDITABLE_ROLES
    if action in {
        ListAction.MANAGE_MEMBERS,
        ListAction.INVITE,
        ListAction.CHANGE_ROLE,
    }:
        return role == ListMembership.Role.OWNER and is_collaborative(user_list)
    if action in {ListAction.MANAGE_SETTINGS, ListAction.DELETE}:
        return role == ListMembership.Role.OWNER

    return False


def accessible_lists_q(user):
    """Return the canonical list visibility predicate for an authenticated user."""
    if not user or not user.is_authenticated:
        return Q(pk__in=[])
    return Q(owner_id=user.id) | Q(
        list_type=UserList.ListType.SHARED,
        memberships__user_id=user.id,
        memberships__role__in=ALL_MEMBER_ROLES,
    )


def member_ids_subquery(list_pk):
    """Return a subquery containing the effective members of a list."""
    return ListMembership.objects.filter(
        user_list_id=list_pk,
        role__in=ALL_MEMBER_ROLES,
    ).filter(
        Q(user_list__list_type=UserList.ListType.SHARED)
        | Q(
            user_list__list_type=UserList.ListType.PERSONAL,
            user_id=F("user_list__owner_id"),
        )
    ).values("user_id")


def effective_member_ids(list_pk):
    return list(member_ids_subquery(list_pk).values_list("user_id", flat=True))


class ListActionPermission:
    """Small DRF-compatible permission factory backed by the central policy."""

    def __new__(cls, action):
        from rest_framework import permissions

        class _ListActionPermission(permissions.BasePermission):
            def has_permission(self, request, view):
                list_pk = view.kwargs.get("list_pk") or view.kwargs.get("pk")
                if not request.user.is_authenticated or not list_pk:
                    return False

                user_list = (
                    UserList.objects.select_related("owner")
                    .filter(pk=list_pk)
                    .first()
                )
                if user_list is None or not can(user_list, request.user, action):
                    return False
                view._authorized_user_list = user_list
                return True

        _ListActionPermission.__name__ = f"List{action.value.title()}Permission"
        return _ListActionPermission()
