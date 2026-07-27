from dataclasses import dataclass

from django.contrib.auth.models import User
from django.db import transaction
from django.db.models import OuterRef, Subquery
from django.utils import timezone

from content.models import ContentItem, Rating, UserContentTracking
from content.services.progress_policy import is_status_supported
from core.error_codes import ErrorCode
from core.exceptions import APIError


FAVORITE_LIMIT_PER_TYPE = 5


@dataclass(frozen=True)
class TrackingTransition:
    tracking: UserContentTracking
    should_prompt_rating: bool
    effects: tuple[str, ...] = ()


@transaction.atomic
def ensure_tracking(
    *,
    user: User,
    content_item: ContentItem,
    status: str = UserContentTracking.Status.BACKLOG,
) -> UserContentTracking:
    if not is_status_supported(content_item.content_type, status):
        raise APIError(
            ErrorCode.TRACKING_STATUS_UNSUPPORTED,
            extra_data={
                "content_type": content_item.content_type,
                "status": status,
            },
        )
    _lock_user(user)
    tracking, _created = UserContentTracking.objects.get_or_create(
        user=user,
        content_item=content_item,
        defaults={"status": status},
    )
    return tracking


def annotate_list_items_with_personal_tracking(queryset, user):
    tracking = UserContentTracking.objects.filter(
        user=user,
        content_item_id=OuterRef("content_item_id"),
    )
    return queryset.annotate(
        personal_tracking_content_id=Subquery(
            tracking.values("content_item_id")[:1]
        ),
        personal_tracking_status=Subquery(tracking.values("status")[:1]),
        personal_tracking_last_completed_at=Subquery(
            tracking.values("last_completed_at")[:1]
        ),
        personal_tracking_is_favorite=Subquery(
            tracking.values("is_favorite")[:1]
        ),
        personal_tracking_favorited_at=Subquery(
            tracking.values("favorited_at")[:1]
        ),
        personal_tracking_created_at=Subquery(
            tracking.values("created_at")[:1]
        ),
        personal_tracking_updated_at=Subquery(
            tracking.values("updated_at")[:1]
        ),
    )


@transaction.atomic
def transition_tracking(
    *,
    user: User,
    content_item: ContentItem,
    status: str,
    acknowledge_effects: bool = False,
) -> TrackingTransition:
    if not is_status_supported(content_item.content_type, status):
        raise APIError(
            ErrorCode.TRACKING_STATUS_UNSUPPORTED,
            extra_data={
                "content_type": content_item.content_type,
                "status": status,
            },
        )
    _lock_user(user)

    tracking, created = UserContentTracking.objects.select_for_update().get_or_create(
        user=user,
        content_item=content_item,
        defaults={
            "status": status,
            "last_completed_at": (
                timezone.now()
                if status == UserContentTracking.Status.COMPLETED
                else None
            ),
        },
    )
    previous_status = tracking.status
    tracking.status = status

    rating = (
        Rating.objects.select_for_update()
        .filter(user=user, content_item=content_item)
        .first()
    )
    should_prompt_rating = False
    effects = []

    if (
        not created
        and previous_status == UserContentTracking.Status.COMPLETED
        and status != UserContentTracking.Status.COMPLETED
    ):
        if rating is not None and rating.is_active:
            effects.append(
                "review_archived" if (rating.comment or "").strip() else "rating_archived"
            )
        if tracking.is_favorite:
            effects.append("favorite_removed")
        if effects and not acknowledge_effects:
            raise APIError(
                ErrorCode.TRACKING_EFFECTS_REQUIRE_CONFIRMATION,
                extra_data={
                    "effects": effects,
                    "current_status": previous_status,
                    "requested_status": status,
                },
            )

    if status == UserContentTracking.Status.COMPLETED:
        if not created and previous_status != UserContentTracking.Status.COMPLETED:
            tracking.last_completed_at = timezone.now()
        if rating is None:
            should_prompt_rating = True
        elif not rating.is_active:
            rating.is_active = True
            rating.spoiler = bool((rating.comment or "").strip()) and rating.spoiler
            rating.save(update_fields=["is_active", "spoiler", "updated_at"])
    elif rating is not None and rating.is_active:
        rating.is_active = False
        rating.save(update_fields=["is_active", "updated_at"])
        if tracking.is_favorite:
            tracking.is_favorite = False
            tracking.favorited_at = None
    elif status != UserContentTracking.Status.COMPLETED and tracking.is_favorite:
        tracking.is_favorite = False
        tracking.favorited_at = None

    tracking.save()
    return TrackingTransition(
        tracking=tracking,
        should_prompt_rating=should_prompt_rating,
        effects=tuple(effects),
    )


@transaction.atomic
def save_rating(
    *,
    user: User,
    content_item: ContentItem,
    score,
    comment: str = "",
    spoiler: bool = False,
) -> Rating:
    _lock_user(user)

    tracking, created = UserContentTracking.objects.select_for_update().get_or_create(
        user=user,
        content_item=content_item,
        defaults={
            "status": UserContentTracking.Status.COMPLETED,
            "last_completed_at": timezone.now(),
        },
    )
    if not created and tracking.status != UserContentTracking.Status.COMPLETED:
        tracking.status = UserContentTracking.Status.COMPLETED
        tracking.last_completed_at = timezone.now()
        tracking.save(update_fields=["status", "last_completed_at", "updated_at"])

    normalized_comment = (comment or "").strip()
    rating, _created = Rating.objects.update_or_create(
        user=user,
        content_item=content_item,
        defaults={
            "score": score,
            "comment": normalized_comment,
            "spoiler": bool(normalized_comment) and spoiler,
            "is_active": True,
        },
    )
    return rating


@transaction.atomic
def set_favorite(
    *,
    user: User,
    content_item: ContentItem,
    is_favorite: bool,
) -> UserContentTracking:
    _lock_user(user)

    tracking = UserContentTracking.objects.select_for_update().filter(
        user=user,
        content_item=content_item,
    ).first()
    if tracking is None or (
        is_favorite and tracking.status != UserContentTracking.Status.COMPLETED
    ):
        raise APIError(ErrorCode.TRACKING_NOT_COMPLETED)

    if is_favorite and not tracking.is_favorite:
        favorite_count = (
            UserContentTracking.objects.select_for_update()
            .filter(
                user=user,
                is_favorite=True,
                content_item__content_type=content_item.content_type,
            )
            .exclude(pk=tracking.pk)
            .count()
        )
        if favorite_count >= FAVORITE_LIMIT_PER_TYPE:
            raise APIError(
                ErrorCode.FAVORITE_LIMIT_REACHED,
                extra_data={
                    "content_type": content_item.content_type,
                    "limit": FAVORITE_LIMIT_PER_TYPE,
                },
            )

    tracking.is_favorite = is_favorite
    tracking.favorited_at = timezone.now() if is_favorite else None
    tracking.save(update_fields=["is_favorite", "favorited_at", "updated_at"])
    return tracking


@transaction.atomic
def delete_tracking(
    *,
    user: User,
    content_item: ContentItem,
    acknowledge_effects: bool = False,
) -> bool:
    _lock_user(user)

    tracking = UserContentTracking.objects.select_for_update().filter(
        user=user,
        content_item=content_item,
    ).first()
    if tracking is None:
        return False

    rating = Rating.objects.select_for_update().filter(
        user=user,
        content_item=content_item,
        is_active=True,
    ).first()
    effects = []
    if rating is not None:
        effects.append(
            "review_archived" if (rating.comment or "").strip() else "rating_archived"
        )
    if tracking.is_favorite:
        effects.append("favorite_removed")
    if effects and not acknowledge_effects:
        raise APIError(
            ErrorCode.TRACKING_EFFECTS_REQUIRE_CONFIRMATION,
            extra_data={
                "effects": effects,
                "current_status": tracking.status,
                "requested_status": None,
            },
        )

    if rating is not None:
        rating.is_active = False
        rating.save(update_fields=["is_active", "updated_at"])
    tracking.delete()
    return True


def _lock_user(user: User) -> None:
    User.objects.select_for_update().only("id").get(pk=user.pk)
