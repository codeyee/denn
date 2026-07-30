from django.db import transaction
from django.db.models import Count, Prefetch, Subquery

from content.models import ListMembership, UserList, ListItem, Rating
from .list_policy import (
    accessible_lists_q,
    effective_membership_count_filter,
    effective_memberships,
    is_collaborative,
    member_ids_subquery,
)


def get_user_lists(user, *, list_pk=None, item_filters=None, ratings_queryset=None, items_queryset=None):
    """
    Return the annotated UserList queryset for a user (owner or member).
    Annotations: item_count_annotated, member_count_annotated.
    """
    qs = UserList.objects.filter(accessible_lists_q(user)).distinct().select_related(
        'owner'
    ).prefetch_related(
        'memberships',
    ).annotate(
        item_count_annotated=Count('items', distinct=True),
        member_count_annotated=Count(
            'memberships',
            filter=effective_membership_count_filter(),
            distinct=True,
        ),
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
            user_id__in=Subquery(member_ids_subquery(list_pk))
        ).select_related('user').order_by('-created_at')
    return Rating.objects.filter(is_active=True).select_related(
        'user'
    ).order_by('-created_at')


def get_list_stats(user_list):
    """Return aggregated statistics for a list using DB queries."""
    from django.db.models import Count, Q as _Q

    items_qs = user_list.items.all()
    if user_list.list_type in (
        UserList.ListType.PERSONAL,
        UserList.ListType.DYNAMIC,
    ):
        from content.models import UserContentTracking

        tracked_ids = items_qs.values_list("content_item_id", flat=True)
        completed = UserContentTracking.objects.filter(
            user_id=user_list.owner_id,
            content_item_id__in=tracked_ids,
            status=UserContentTracking.Status.COMPLETED,
        ).count()
        total = items_qs.count()
        counts = {
            "total": total,
            "pending": total - completed,
            "completed": completed,
        }
    else:
        counts = items_qs.aggregate(
            total=Count('id'),
            pending=Count('id', filter=_Q(context_status='PENDING')),
            completed=Count('id', filter=_Q(context_status='COMPLETED')),
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
        'member_count': len(effective_memberships(user_list)),
        'content_types': content_types,
    }


def ensure_owner_membership(user_list):
    """Repair the single persisted owner membership for editable lists."""
    if user_list.list_type == UserList.ListType.DYNAMIC:
        return None

    with transaction.atomic():
        ListMembership.objects.filter(
            user_list_id=user_list.id,
            role=ListMembership.Role.OWNER,
        ).exclude(user_id=user_list.owner_id).update(
            role=ListMembership.Role.EDITOR,
        )
        return ListMembership.objects.update_or_create(
            user_list_id=user_list.id,
            user_id=user_list.owner_id,
            defaults={'role': ListMembership.Role.OWNER},
        )[0]


def add_member(user_list, user, role=ListMembership.Role.EDITOR):
    """Create a shared-list membership without allowing owner escalation."""
    if not is_collaborative(user_list):
        raise ValueError('Solo las listas compartidas admiten miembros.')
    if role == ListMembership.Role.OWNER:
        raise ValueError('El owner se gestiona mediante UserList.owner.')
    return ListMembership.objects.get_or_create(
        user_list_id=user_list.id,
        user_id=user.id,
        defaults={'role': role},
    )[0]


def remove_member(user_list, user_to_remove):
    """
    Remove a member from a shared list.
    Returns (success: bool, error_detail: str|None, http_status: int|None).
    """
    from rest_framework import status as http_status

    if not is_collaborative(user_list):
        return False, 'Solo se pueden eliminar miembros de listas compartidas.', http_status.HTTP_400_BAD_REQUEST

    if user_to_remove == user_list.owner:
        return False, 'El propietario no puede eliminarse de la lista.', http_status.HTTP_400_BAD_REQUEST

    membership = ListMembership.objects.filter(
        user_list_id=user_list.id,
        user_id=user_to_remove.id,
    ).first()
    if membership is None:
        return False, 'El usuario no es miembro de esta lista.', http_status.HTTP_400_BAD_REQUEST

    membership.delete()
    return True, None, None
