from django.db.models import Q, Count, Prefetch, Subquery
from django.contrib.auth.models import User

from content.models import UserList, ListItem, Rating


def get_user_lists(user, *, list_pk=None, item_filters=None, ratings_queryset=None, items_queryset=None):
    """
    Return the annotated UserList queryset for a user (owner or member).
    Annotations: item_count_annotated, member_count_annotated.
    """
    qs = UserList.objects.filter(
        Q(owner=user) | Q(members=user)
    ).distinct().select_related(
        'owner'
    ).prefetch_related(
        'members',
    ).annotate(
        item_count_annotated=Count('items', distinct=True),
        member_count_annotated=Count('members', distinct=True),
    )

    if items_queryset is not None:
        qs = qs.prefetch_related(Prefetch('items', queryset=items_queryset))

    return qs


def build_items_queryset(*, item_filters=None, ratings_queryset=None):
    """Build the ListItem queryset used as a Prefetch for UserList.items."""
    filters = item_filters or {}
    qs = ListItem.objects.filter(**filters).select_related(
        'content_item',
        'added_by',
    ).order_by('list_order', '-added_at')

    if ratings_queryset is not None:
        qs = qs.prefetch_related(
            Prefetch(
                'content_item__ratings',
                queryset=ratings_queryset,
                to_attr='member_ratings_prefetched',
            )
        )

    return qs


def build_ratings_queryset(*, list_pk=None):
    """Build the Rating queryset for prefetching member ratings."""
    if list_pk:
        return Rating.objects.filter(
            is_active=True,
            user_id__in=Subquery(
                UserList.objects.filter(pk=list_pk).values('members__id')
            )
        ).select_related('user').order_by('-created_at')
    return Rating.objects.filter(is_active=True).select_related(
        'user'
    ).order_by('-created_at')


def get_list_stats(user_list):
    """Return aggregated statistics for a list using DB queries."""
    from django.db.models import Count, Q as _Q

    items_qs = user_list.items.all()
    counts = items_qs.aggregate(
        total=Count('id'),
        pending=Count('id', filter=_Q(status='PENDING')),
        completed=Count('id', filter=_Q(status='COMPLETED')),
    )
    content_types_qs = items_qs.values(
        'content_item__content_type'
    ).annotate(count=Count('id')).order_by()

    content_types = {
        row['content_item__content_type']: row['count']
        for row in content_types_qs
    }

    return {
        'total_items': counts['total'],
        'pending_items': counts['pending'],
        'completed_items': counts['completed'],
        'member_count': user_list.members.count(),
        'content_types': content_types,
    }


def ensure_owner_membership(user_list):
    """Ensure the owner is in the members M2M for SHARED lists."""
    if user_list.list_type == UserList.ListType.SHARED:
        if not user_list.members.filter(pk=user_list.owner_id).exists():
            user_list.members.add(user_list.owner)


def remove_member(user_list, user_to_remove):
    """
    Remove a member from a shared list.
    Returns (success: bool, error_detail: str|None, http_status: int|None).
    """
    from rest_framework import status as http_status

    if user_list.list_type != UserList.ListType.SHARED:
        return False, 'Solo se pueden eliminar miembros de listas compartidas.', http_status.HTTP_400_BAD_REQUEST

    if user_to_remove == user_list.owner:
        return False, 'El propietario no puede eliminarse de la lista.', http_status.HTTP_400_BAD_REQUEST

    if not user_list.members.filter(id=user_to_remove.id).exists():
        return False, 'El usuario no es miembro de esta lista.', http_status.HTTP_400_BAD_REQUEST

    user_list.members.remove(user_to_remove)
    return True, None, None
