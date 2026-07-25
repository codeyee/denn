from dataclasses import dataclass

from django.contrib.auth.models import User
from django.db import transaction
from django.utils import timezone

from content.models import ContentItem, Rating, UserContentTracking
from core.error_codes import ErrorCode
from core.exceptions import APIError


FAVORITE_LIMIT_PER_TYPE = 5


@dataclass(frozen=True)
class TrackingTransition:
    tracking: UserContentTracking
    should_prompt_rating: bool


def canonicalize_tracking_content(content_item: ContentItem) -> ContentItem:
    if content_item.content_type != ContentItem.ContentType.SEASON:
        return content_item

    try:
        tv_show = content_item.season_detail.tv_show
    except Exception:
        tv_show = None

    if tv_show is None:
        raise APIError(
            ErrorCode.TRACKING_PARENT_MISSING,
            extra_data={
                "content_item_id": content_item.pk,
                "requires_backfill": True,
            },
        )
    return tv_show


@transaction.atomic
def transition_tracking(
    *,
    user: User,
    content_item: ContentItem,
    status: str,
) -> TrackingTransition:
    canonical_item = canonicalize_tracking_content(content_item)
    _lock_user(user)

    tracking, created = UserContentTracking.objects.select_for_update().get_or_create(
        user=user,
        content_item=canonical_item,
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
        .filter(user=user, content_item=canonical_item)
        .first()
    )
    should_prompt_rating = False

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

    tracking.save()
    return TrackingTransition(
        tracking=tracking,
        should_prompt_rating=should_prompt_rating,
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
    canonical_item = canonicalize_tracking_content(content_item)
    _lock_user(user)

    tracking, created = UserContentTracking.objects.select_for_update().get_or_create(
        user=user,
        content_item=canonical_item,
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
        content_item=canonical_item,
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
    canonical_item = canonicalize_tracking_content(content_item)
    _lock_user(user)

    tracking = UserContentTracking.objects.select_for_update().filter(
        user=user,
        content_item=canonical_item,
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
                content_item__content_type=canonical_item.content_type,
            )
            .exclude(pk=tracking.pk)
            .count()
        )
        if favorite_count >= FAVORITE_LIMIT_PER_TYPE:
            raise APIError(
                ErrorCode.FAVORITE_LIMIT_REACHED,
                extra_data={
                    "content_type": canonical_item.content_type,
                    "limit": FAVORITE_LIMIT_PER_TYPE,
                },
            )

    tracking.is_favorite = is_favorite
    tracking.favorited_at = timezone.now() if is_favorite else None
    tracking.save(update_fields=["is_favorite", "favorited_at", "updated_at"])
    return tracking


@transaction.atomic
def delete_tracking(*, user: User, content_item: ContentItem) -> bool:
    canonical_item = canonicalize_tracking_content(content_item)
    _lock_user(user)

    tracking = UserContentTracking.objects.select_for_update().filter(
        user=user,
        content_item=canonical_item,
    ).first()
    if tracking is None:
        return False

    rating = Rating.objects.select_for_update().filter(
        user=user,
        content_item=canonical_item,
        is_active=True,
    ).first()
    if rating is not None:
        rating.is_active = False
        rating.save(update_fields=["is_active", "updated_at"])
    tracking.delete()
    return True


def _lock_user(user: User) -> None:
    User.objects.select_for_update().only("id").get(pk=user.pk)
