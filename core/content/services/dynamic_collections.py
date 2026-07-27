from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable

from django.db import transaction
from collections import defaultdict

from django.db.models import Count, QuerySet
from django.db.models.query import Prefetch

from authentication.models import UserPreferences
from content.models import (
    ContentItem,
    ContentItemAuthor,
    DynamicCollectionPreference,
    Image,
    ListItem,
    UserList,
    UserContentTracking,
)


@dataclass(frozen=True)
class DynamicCollectionDefinition:
    key: str
    name: str
    group: str
    status: str | None = None
    content_types: tuple[str, ...] = ()
    random_enabled: bool = False


DYNAMIC_COLLECTIONS: tuple[DynamicCollectionDefinition, ...] = (
    DynamicCollectionDefinition(
        key=DynamicCollectionPreference.CollectionKey.BACKLOG,
        name="Backlog",
        group="status",
        status=UserContentTracking.Status.BACKLOG,
        random_enabled=True,
    ),
    DynamicCollectionDefinition(
        key=DynamicCollectionPreference.CollectionKey.IN_PROGRESS,
        name="In progress",
        group="status",
        status=UserContentTracking.Status.IN_PROGRESS,
    ),
    DynamicCollectionDefinition(
        key=DynamicCollectionPreference.CollectionKey.ON_HOLD,
        name="On hold",
        group="status",
        status=UserContentTracking.Status.ON_HOLD,
    ),
    DynamicCollectionDefinition(
        key=DynamicCollectionPreference.CollectionKey.DROPPED,
        name="Dropped",
        group="status",
        status=UserContentTracking.Status.DROPPED,
    ),
    DynamicCollectionDefinition(
        key=DynamicCollectionPreference.CollectionKey.COMPLETED,
        name="Completed",
        group="status",
        status=UserContentTracking.Status.COMPLETED,
    ),
    DynamicCollectionDefinition(
        key=DynamicCollectionPreference.CollectionKey.MOVIES,
        name="Movies",
        group="type",
        content_types=(ContentItem.ContentType.MOVIE,),
        random_enabled=True,
    ),
    DynamicCollectionDefinition(
        key=DynamicCollectionPreference.CollectionKey.SERIES,
        name="Series",
        group="type",
        content_types=(
            ContentItem.ContentType.TV_SHOW,
            ContentItem.ContentType.SEASON,
        ),
        random_enabled=True,
    ),
    DynamicCollectionDefinition(
        key=DynamicCollectionPreference.CollectionKey.GAMES,
        name="Games",
        group="type",
        content_types=(ContentItem.ContentType.GAME,),
        random_enabled=True,
    ),
    DynamicCollectionDefinition(
        key=DynamicCollectionPreference.CollectionKey.ALBUMS,
        name="Albums",
        group="type",
        content_types=(ContentItem.ContentType.ALBUM,),
        random_enabled=True,
    ),
    DynamicCollectionDefinition(
        key=DynamicCollectionPreference.CollectionKey.BOOKS,
        name="Books",
        group="type",
        content_types=(ContentItem.ContentType.BOOK,),
        random_enabled=True,
    ),
)

COLLECTION_BY_KEY = {definition.key: definition for definition in DYNAMIC_COLLECTIONS}

CONTENT_DETAIL_RELATIONS = (
    "content_item__browse_meta",
    "content_item__movie_detail",
    "content_item__tv_show_detail",
    "content_item__season_detail",
    "content_item__game_detail",
    "content_item__album_detail",
    "content_item__book_detail",
)


def get_definition(key: str) -> DynamicCollectionDefinition | None:
    return COLLECTION_BY_KEY.get(key)


def collection_settings(user) -> tuple[bool, dict[str, bool]]:
    try:
        globally_enabled = user.preferences.dynamic_collections_enabled
    except UserPreferences.DoesNotExist:
        globally_enabled = True

    overrides = dict(
        DynamicCollectionPreference.objects.filter(user=user).values_list(
            "collection_key",
            "enabled",
        )
    )
    return globally_enabled, {
        definition.key: overrides.get(definition.key, True)
        for definition in DYNAMIC_COLLECTIONS
    }


def is_collection_available(user, definition: DynamicCollectionDefinition) -> bool:
    globally_enabled, enabled_by_key = collection_settings(user)
    return globally_enabled and enabled_by_key[definition.key]


def ensure_dynamic_collections(user) -> dict[str, UserList]:
    """Create the ten system lists lazily, without touching manual lists."""
    existing = {
        user_list.dynamic_key: user_list
        for user_list in UserList.objects.filter(
            owner=user,
            list_type=UserList.ListType.DYNAMIC,
        )
    }
    missing = [
        definition
        for definition in DYNAMIC_COLLECTIONS
        if definition.key not in existing
    ]
    if missing:
        UserList.objects.bulk_create([
            UserList(
                owner=user,
                dynamic_key=definition.key,
                name=definition.name,
                description="Automatically populated from your progress.",
                list_type=UserList.ListType.DYNAMIC,
                visibility=UserList.Visibility.PUBLIC,
            )
            for definition in missing
        ])
        existing = {
            user_list.dynamic_key: user_list
            for user_list in UserList.objects.filter(
                owner=user,
                list_type=UserList.ListType.DYNAMIC,
            )
        }
    return existing


def dynamic_list_queryset(user):
    """Return only system lists that are currently visible to their owner."""
    globally_enabled, enabled_by_key = collection_settings(user)
    if not globally_enabled:
        return UserList.objects.none()
    visible_keys = [key for key, enabled in enabled_by_key.items() if enabled]
    return UserList.objects.filter(
        owner=user,
        list_type=UserList.ListType.DYNAMIC,
        dynamic_key__in=visible_keys,
    )


@transaction.atomic
def sync_dynamic_collections(user) -> dict[str, UserList]:
    """Materialize tracking filters as read-only ListItem membership."""
    lists_by_key = ensure_dynamic_collections(user)
    tracking_rows = list(
        UserContentTracking.objects.filter(user=user).values_list(
            "content_item_id",
            "status",
            "content_item__content_type",
        )
    )

    expected_ids: dict[str, set[int]] = {
        definition.key: set() for definition in DYNAMIC_COLLECTIONS
    }
    for content_item_id, status, content_type in tracking_rows:
        for definition in DYNAMIC_COLLECTIONS:
            if definition.status and definition.status != status:
                continue
            if definition.content_types and content_type not in definition.content_types:
                continue
            expected_ids[definition.key].add(content_item_id)

    list_key_by_id = {user_list.id: key for key, user_list in lists_by_key.items()}
    existing_items: dict[str, dict[int, tuple[int, int]]] = defaultdict(dict)
    for item_id, list_id, content_item_id, list_order in ListItem.objects.filter(
        user_list_id__in=list_key_by_id,
    ).values_list("id", "user_list_id", "content_item_id", "list_order"):
        existing_items[list_key_by_id[list_id]][content_item_id] = (item_id, list_order)

    stale_item_ids: list[int] = []
    new_items: list[ListItem] = []
    for definition in DYNAMIC_COLLECTIONS:
        key = definition.key
        target_ids = expected_ids[key]
        current = existing_items[key]
        stale_item_ids.extend(
            item_id
            for content_item_id, (item_id, _order) in current.items()
            if content_item_id not in target_ids
        )
        missing_ids = sorted(target_ids - current.keys())
        next_order = max((order for _item_id, order in current.values()), default=0) + 1
        user_list = lists_by_key[key]
        new_items.extend(
            ListItem(
                user_list=user_list,
                content_item_id=content_item_id,
                added_by=user,
                list_order=next_order + index,
            )
            for index, content_item_id in enumerate(missing_ids)
        )
    if stale_item_ids:
        ListItem.objects.filter(id__in=stale_item_ids).delete()
    if new_items:
        ListItem.objects.bulk_create(new_items)
    return lists_by_key


def base_tracking_queryset(user) -> QuerySet[UserContentTracking]:
    return (
        UserContentTracking.objects.filter(user=user)
        .select_related("content_item", *CONTENT_DETAIL_RELATIONS)
        .prefetch_related(
            Prefetch(
                "content_item__images",
                queryset=Image.objects.order_by("position", "id"),
            ),
            Prefetch(
                "content_item__content_authors",
                queryset=ContentItemAuthor.objects.select_related("author").order_by(
                    "position",
                    "id",
                ),
            ),
        )
    )


def collection_queryset(
    user,
    definition: DynamicCollectionDefinition,
    *,
    search: str = "",
) -> QuerySet[UserContentTracking]:
    queryset = base_tracking_queryset(user)
    if definition.status:
        queryset = queryset.filter(status=definition.status)
    if definition.content_types:
        queryset = queryset.filter(
            content_item__content_type__in=definition.content_types,
        )
    if search:
        queryset = queryset.filter(
            content_item__browse_meta__display_title__icontains=search,
        )
    return queryset


def collection_counts(user) -> dict[str, int]:
    rows = UserContentTracking.objects.filter(user=user).values(
        "status",
        "content_item__content_type",
    ).annotate(count=Count("id"))
    counts = {definition.key: 0 for definition in DYNAMIC_COLLECTIONS}
    for row in rows:
        for definition in DYNAMIC_COLLECTIONS:
            if definition.status and definition.status != row["status"]:
                continue
            if (
                definition.content_types
                and row["content_item__content_type"] not in definition.content_types
            ):
                continue
            counts[definition.key] += row["count"]
    return counts


def collection_cover_images(user) -> dict[str, list[str]]:
    covers: dict[str, list[str]] = {}
    for definition in DYNAMIC_COLLECTIONS:
        images: list[str] = []
        for tracking in collection_queryset(user, definition).order_by(
            "-updated_at",
            "-id",
        )[:4]:
            poster = next(
                (
                    image.image_url
                    for image in tracking.content_item.images.all()
                    if image.type == Image.Type.POSTER
                ),
                None,
            )
            if poster:
                images.append(poster)
        covers[definition.key] = images
    return covers


def update_collection_settings(
    user,
    *,
    globally_enabled: bool | None,
    collection_changes: Iterable[tuple[str, bool]],
) -> tuple[bool, dict[str, bool]]:
    if globally_enabled is not None:
        UserPreferences.objects.update_or_create(
            user=user,
            defaults={"dynamic_collections_enabled": globally_enabled},
        )
    for key, enabled in collection_changes:
        DynamicCollectionPreference.objects.update_or_create(
            user=user,
            collection_key=key,
            defaults={"enabled": enabled},
        )
    return collection_settings(user)
