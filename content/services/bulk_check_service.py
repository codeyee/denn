from django.db.models import Q, Count

from content.models import ContentItem, UserList, ListItem


def check_items_in_lists(user, validated_items):
    """
    Read-only check: find which of the given items already exist in the user's lists.
    Does NOT create any ContentItem rows.

    Returns dict: {'queried_items_count': int, 'lists': [...]}
    """
    lookups = Q()
    for item in validated_items:
        lookups |= Q(
            source_api=item['source_api'],
            external_id=item['external_id'],
            content_type=item['content_type'],
        )

    if not lookups:
        content_items = ContentItem.objects.none()
    else:
        content_items = ContentItem.objects.filter(lookups)

    user_lists = UserList.objects.filter(
        Q(owner=user) | Q(members=user)
    ).distinct().select_related('owner').prefetch_related('members').annotate(
        item_count_annotated=Count('items'),
    )

    list_items = ListItem.objects.filter(
        user_list__in=user_lists,
        content_item__in=content_items,
    ).select_related('content_item', 'user_list')

    list_to_items = {}
    for li in list_items:
        list_to_items.setdefault(li.user_list_id, []).append(li)

    lists_response = []
    for ul in user_lists:
        matched = list_to_items.get(ul.id, [])
        lists_response.append({
            'id': ul.id,
            'name': ul.name,
            'list_type': ul.list_type,
            'item_count': ul.item_count_annotated,
            'matched_count': len(matched),
            'matched_items': [
                {
                    'list_item_id': li.id,
                    'content_item_id': li.content_item.id,
                    'external_id': li.content_item.external_id,
                    'source_api': li.content_item.source_api,
                    'content_type': li.content_item.content_type,
                }
                for li in matched
            ],
        })

    return {
        'queried_items_count': len(validated_items),
        'lists': lists_response,
    }


def ensure_content_items(validated_items):
    """
    Get-or-create ContentItem rows for each validated item.
    Delegates to `local_content_store.get_or_create_content_item` so all
    ingest paths share the same ID-allocation logic.
    """
    from content.services.local_content_store import get_or_create_content_item

    results = []
    for item in validated_items:
        ci, _ = get_or_create_content_item(
            source_api=item['source_api'],
            external_id=item['external_id'],
            content_type=item['content_type'],
        )
        results.append(ci)
    return results
