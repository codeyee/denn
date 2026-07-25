from django.db.models import Avg, Count, Q, Subquery

from content.models import Rating, UserList, ListItem


def get_member_ratings_queryset(*, list_pk=None):
    """
    Build a Rating queryset suitable for Prefetch(to_attr='member_ratings_prefetched').
    If list_pk is given, restricts to ratings from that list's members.
    """
    qs = Rating.objects.filter(is_active=True).select_related('user').order_by('-created_at')
    if list_pk:
        qs = qs.filter(
            user_id__in=Subquery(
                UserList.objects.filter(pk=list_pk).values('members__id')
            )
        )
    return qs


def annotate_items_with_ratings(items_qs, member_ids):
    """
    Annotate a ListItem queryset with member_rating_avg_annotated and
    member_rating_count_annotated, filtered to the given member_ids.
    """
    return items_qs.annotate(
        member_rating_avg_annotated=Avg(
            'content_item__ratings__score',
            filter=Q(
                content_item__ratings__user_id__in=member_ids,
                content_item__ratings__is_active=True,
            ),
        ),
        member_rating_count_annotated=Count(
            'content_item__ratings',
            filter=Q(
                content_item__ratings__user_id__in=member_ids,
                content_item__ratings__is_active=True,
            ),
            distinct=True,
        ),
    )
