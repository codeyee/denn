from collections import defaultdict
from decimal import Decimal, InvalidOperation

from django.contrib.auth.models import User
from django.db.models import (
    Count,
    Exists,
    F,
    IntegerField,
    OuterRef,
    Prefetch,
    Q,
    Subquery,
    Value,
)
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from authentication.models import UserPublicProfile
from authentication.serializers import (
    PublicCompletedItemSerializer,
    PublicListSerializer,
    PublicProfileIdentitySerializer,
    PublicProfileOverviewSerializer,
    PublicProgressItemSerializer,
    PublicRatingItemSerializer,
    UserPublicProfileEditSerializer,
)
from content.models import (
    ContentItem,
    ContentItemAuthor,
    Image,
    Rating,
    UserContentTracking,
    UserList,
)
from content.serializers import LocalContentSummarySerializer
from core.pagination import PublicProfilePagination
from core.throttling import PublicProfileRateThrottle


CONTENT_RELATED_FIELDS = (
    "browse_meta",
    "movie_detail",
    "tv_show_detail",
    "season_detail",
    "game_detail",
    "album_detail",
    "book_detail",
)


def _content_prefetches(prefix=""):
    return (
        Prefetch(
            f"{prefix}images",
            queryset=Image.objects.order_by("position", "id"),
        ),
        Prefetch(
            f"{prefix}content_authors",
            queryset=ContentItemAuthor.objects.select_related("author").order_by(
                "position",
                "id",
            ),
        ),
    )


def _profile_filter_parameters(*extra, multi_type=False):
    return [
        OpenApiParameter("q", str),
        OpenApiParameter(
            "type",
            str,
            enum=ContentItem.ContentType.values,
            many=multi_type,
        ),
        OpenApiParameter("page", int),
        OpenApiParameter("page_size", int),
        *extra,
    ]


class PublicProfileBaseView(generics.GenericAPIView):
    permission_classes = [AllowAny]
    throttle_classes = [PublicProfileRateThrottle]
    pagination_class = PublicProfilePagination

    def get_profile_user(self):
        return get_object_or_404(
            User.objects.select_related("public_profile"),
            username=self.kwargs["username"],
        )


class PublicProfileOverviewView(PublicProfileBaseView):
    def get_profile_user(self):
        public_list_count = (
            UserList.objects.filter(
                Q(owner_id=OuterRef("pk")) | Q(members__id=OuterRef("pk")),
                visibility=UserList.Visibility.PUBLIC,
            ).exclude(list_type=UserList.ListType.DYNAMIC)
            .order_by()
            .values("visibility")
            .annotate(total=Count("id", distinct=True))
            .values("total")[:1]
        )
        return get_object_or_404(
            User.objects.select_related("public_profile").annotate(
                active_rating_count=Count(
                    "ratings",
                    filter=Q(ratings__is_active=True),
                    distinct=True,
                ),
                active_review_count=Count(
                    "ratings",
                    filter=(
                        Q(
                            ratings__is_active=True,
                            ratings__comment__isnull=False,
                        )
                        & ~Q(ratings__comment="")
                    ),
                    distinct=True,
                ),
                public_list_count=Coalesce(
                    Subquery(public_list_count, output_field=IntegerField()),
                    Value(0),
                ),
            ),
            username=self.kwargs["username"],
        )

    @extend_schema(
        tags=["Public Profiles"],
        summary="Get a public profile overview",
        responses={200: PublicProfileOverviewSerializer},
    )
    def get(self, request, username):
        user = self.get_profile_user()
        try:
            profile = user.public_profile
        except UserPublicProfile.DoesNotExist:
            profile = UserPublicProfile.objects.create(user=user)

        completed_by_type_rows = UserContentTracking.objects.filter(
            user=user,
            status=UserContentTracking.Status.COMPLETED,
        ).values("content_item__content_type").annotate(count=Count("id"))
        completed_by_type = {
            row["content_item__content_type"]: row["count"]
            for row in completed_by_type_rows
        }
        completed_count = sum(completed_by_type.values())

        active_score = Rating.objects.filter(
            user=user,
            content_item_id=OuterRef("content_item_id"),
            is_active=True,
        ).values("score")[:1]
        favorite_rows = list(
            UserContentTracking.objects.filter(
                user=user,
                status=UserContentTracking.Status.COMPLETED,
                is_favorite=True,
            )
            .annotate(score=Subquery(active_score))
            .values(
                "content_item_id",
                "content_item__content_type",
                "favorited_at",
                "score",
            )
            .order_by("-favorited_at", "-id")
        )
        review_rows = list(
            Rating.objects.filter(
                user=user,
                is_active=True,
                comment__isnull=False,
            )
            .exclude(comment="")
            .values(
                "id",
                "content_item_id",
                "score",
                "comment",
                "spoiler",
                "created_at",
                "updated_at",
            )
            .order_by("-created_at", "-id")[:4]
        )
        completed_rows = list(
            UserContentTracking.objects.filter(
                user=user,
                status=UserContentTracking.Status.COMPLETED,
            )
            .annotate(score=Subquery(active_score))
            .values(
                "content_item_id",
                "last_completed_at",
                "is_favorite",
                "score",
            )
            .order_by("-last_completed_at", "-id")[:6]
        )

        public_lists = _public_lists_queryset(user)
        list_rows = list(
            public_lists.select_related("owner")
            .prefetch_related(
                Prefetch("members", queryset=User.objects.only("id", "username"))
            )
            .annotate(
                item_count_annotated=Count("items", distinct=True),
                member_count_annotated=Count("members", distinct=True),
            )
            .order_by("-updated_at", "-id")[:4]
        )

        content_ids = {
            row["content_item_id"]
            for row in favorite_rows + review_rows + completed_rows
        }
        content_map = _content_map(content_ids)

        favorites = defaultdict(list)
        for row in favorite_rows:
            content = content_map.get(row["content_item_id"])
            if content is None:
                continue
            content_type = row["content_item__content_type"]
            if len(favorites[content_type]) >= 5:
                continue
            favorites[content_type].append(
                {
                    "content": _serialize_content(content),
                    "favorited_at": row["favorited_at"],
                    "score": row["score"],
                }
            )

        recent_reviews = [
            _serialize_rating(row, content_map, is_favorite=False)
            for row in review_rows
            if row["content_item_id"] in content_map
        ]
        favorite_ids = {
            row["content_item_id"]
            for row in favorite_rows
        }
        for review in recent_reviews:
            review["is_favorite"] = review["content"]["id"] in favorite_ids

        recent_completed = [
            _serialize_completed(row, content_map)
            for row in completed_rows
            if row["content_item_id"] in content_map
        ]
        serialized_lists = [_serialize_list(row, user) for row in list_rows]
        banner_media = _select_banner_media(favorite_rows, content_map)
        selected_banner = _selected_banner_media(
            profile,
            favorite_rows,
            content_map,
        )
        banner_options = _select_banner_options(favorite_rows, content_map)

        payload = {
            "profile": PublicProfileIdentitySerializer(profile).data,
            "counters": {
                "completed": completed_count,
                "ratings": user.active_rating_count,
                "reviews": user.active_review_count,
                "public_lists": user.public_list_count,
                "completed_by_type": completed_by_type,
            },
            "favorites": dict(favorites),
            "recent_reviews": recent_reviews,
            "recent_completed": recent_completed,
            "public_lists": serialized_lists,
            "banner_media": banner_media,
            "selected_banner": selected_banner,
            "banner_options": banner_options,
        }
        return Response(payload)


class PublicProfileCompletedView(PublicProfileBaseView):
    serializer_class = PublicCompletedItemSerializer

    @extend_schema(
        tags=["Public Profiles"],
        summary="List completed content for a public profile",
        parameters=_profile_filter_parameters(
            OpenApiParameter(
                "sort",
                str,
                enum=["date_desc", "date_asc", "title", "-title", "score", "-score"],
            )
        ),
        responses={200: PublicCompletedItemSerializer(many=True)},
    )
    def get(self, request, username):
        user = self.get_profile_user()
        active_score = Rating.objects.filter(
            user=user,
            content_item_id=OuterRef("content_item_id"),
            is_active=True,
        ).values("score")[:1]
        queryset = (
            UserContentTracking.objects.filter(
                user=user,
                status=UserContentTracking.Status.COMPLETED,
            )
            .select_related("content_item", *[
                f"content_item__{field}" for field in CONTENT_RELATED_FIELDS
            ])
            .prefetch_related(*_content_prefetches("content_item__"))
            .annotate(
                score=Subquery(active_score),
                content_title=Coalesce(
                    "content_item__browse_meta__display_title",
                    Value(""),
                ),
            )
        )
        queryset = _filter_content_queryset(queryset, request)
        ordering = {
            "date_asc": ("last_completed_at", "id"),
            "title": ("content_title", "id"),
            "-title": ("-content_title", "-id"),
            "score": ("score", "id"),
            "-score": ("-score", "-id"),
        }.get(request.query_params.get("sort"), ("-last_completed_at", "-id"))
        page = self.paginate_queryset(queryset.order_by(*ordering))
        data = [
            {
                "content": _serialize_content(row.content_item),
                "completed_at": row.last_completed_at,
                "is_favorite": row.is_favorite,
                "score": row.score,
            }
            for row in page
        ]
        return self.get_paginated_response(data)


class PublicProfileProgressView(PublicProfileBaseView):
    serializer_class = PublicProgressItemSerializer

    @extend_schema(
        tags=["Public Profiles"],
        summary="List unified personal progress for a public profile",
        parameters=_profile_filter_parameters(
            OpenApiParameter(
                "status",
                str,
                enum=UserContentTracking.Status.values,
                many=True,
            ),
            OpenApiParameter(
                "tvKind",
                str,
                enum=["all", "series", "seasons"],
            ),
            OpenApiParameter("rated", bool),
            OpenApiParameter("reviewed", bool),
            OpenApiParameter("favorite", bool),
            OpenApiParameter("minScore", float),
            OpenApiParameter("maxScore", float),
            OpenApiParameter(
                "sort",
                str,
                enum=[
                    "updated",
                    "title",
                    "score",
                    "completed",
                ],
            ),
            OpenApiParameter("order", str, enum=["asc", "desc"]),
            multi_type=True,
        ),
        responses={200: PublicProgressItemSerializer(many=True)},
    )
    def get(self, request, username):
        user = self.get_profile_user()
        active_rating = Rating.objects.filter(
            user=user,
            content_item_id=OuterRef("content_item_id"),
            is_active=True,
        )
        queryset = (
            UserContentTracking.objects.filter(user=user)
            .select_related(
                "content_item",
                *[
                    f"content_item__{field}"
                    for field in CONTENT_RELATED_FIELDS
                ],
            )
            .prefetch_related(*_content_prefetches("content_item__"))
            .annotate(
                rating_id=Subquery(active_rating.values("id")[:1]),
                rating_score=Subquery(active_rating.values("score")[:1]),
                rating_review=Subquery(active_rating.values("comment")[:1]),
                rating_spoiler=Subquery(active_rating.values("spoiler")[:1]),
                rating_created_at=Subquery(
                    active_rating.values("created_at")[:1]
                ),
                rating_updated_at=Subquery(
                    active_rating.values("updated_at")[:1]
                ),
                has_rating=Exists(active_rating),
                content_title=Coalesce(
                    "content_item__browse_meta__display_title",
                    Value(""),
                ),
            )
        )

        query = request.query_params.get("q", "").strip()
        if query:
            queryset = queryset.filter(
                content_item__browse_meta__display_title__icontains=query
            )
        content_types = _parse_multi_filter(
            request,
            "type",
            ContentItem.ContentType.values,
        )
        tv_kind = request.query_params.get("tvKind", "all")
        if content_types:
            expanded_types = set(content_types)
            if ContentItem.ContentType.TV_SHOW in expanded_types:
                if tv_kind == "seasons":
                    expanded_types.discard(ContentItem.ContentType.TV_SHOW)
                    expanded_types.add(ContentItem.ContentType.SEASON)
                elif tv_kind != "series":
                    expanded_types.add(ContentItem.ContentType.SEASON)
            queryset = queryset.filter(
                content_item__content_type__in=expanded_types
            )

        progress_statuses = _parse_multi_filter(
            request,
            "status",
            UserContentTracking.Status.values,
        )
        if progress_statuses:
            queryset = queryset.filter(status__in=progress_statuses)
        rated = _parse_bool_filter(request, "rated")
        reviewed = _parse_bool_filter(request, "reviewed")
        favorite = _parse_bool_filter(request, "favorite")
        if rated is not None:
            queryset = queryset.filter(has_rating=rated)
        if reviewed is True:
            queryset = queryset.filter(rating_review__isnull=False).exclude(
                rating_review=""
            )
        elif reviewed is False:
            queryset = queryset.filter(
                Q(rating_review__isnull=True) | Q(rating_review="")
            )
        if favorite is not None:
            queryset = queryset.filter(is_favorite=favorite)

        min_score = _parse_score_filter(request, "minScore")
        max_score = _parse_score_filter(request, "maxScore")
        if min_score is not None and max_score is not None and min_score > max_score:
            raise ValidationError({
                "maxScore": ["Must be greater than or equal to minScore."]
            })
        if min_score is not None:
            queryset = queryset.filter(rating_score__gte=min_score)
        if max_score is not None:
            queryset = queryset.filter(rating_score__lte=max_score)

        ordering = _progress_ordering(request)
        page = self.paginate_queryset(queryset.order_by(*ordering))
        data = [
            {
                "id": tracking.id,
                "content": _serialize_content(tracking.content_item),
                "status": tracking.status,
                "completed_at": tracking.last_completed_at,
                "is_favorite": tracking.is_favorite,
                "rating": (
                    {
                        "id": tracking.rating_id,
                        "score": tracking.rating_score,
                        "review": tracking.rating_review,
                        "spoiler": tracking.rating_spoiler,
                        "created_at": tracking.rating_created_at,
                        "updated_at": tracking.rating_updated_at,
                    }
                    if tracking.has_rating
                    else None
                ),
                "created_at": tracking.created_at,
                "updated_at": tracking.updated_at,
            }
            for tracking in page
        ]
        return self.get_paginated_response(data)


class PublicProfileRatingsView(PublicProfileBaseView):
    serializer_class = PublicRatingItemSerializer

    @extend_schema(
        tags=["Public Profiles"],
        summary="List ratings and reviews for a public profile",
        parameters=_profile_filter_parameters(
            OpenApiParameter(
                "kind",
                str,
                enum=["all", "reviews", "ratings_only"],
            ),
            OpenApiParameter("favorite", bool),
            OpenApiParameter("minScore", float),
            OpenApiParameter("maxScore", float),
            OpenApiParameter(
                "sort",
                str,
                enum=["recent", "oldest", "title", "-title", "score", "-score"],
            ),
        ),
        responses={200: PublicRatingItemSerializer(many=True)},
    )
    def get(self, request, username):
        user = self.get_profile_user()
        favorite_tracking = UserContentTracking.objects.filter(
            user=user,
            content_item_id=OuterRef("content_item_id"),
            status=UserContentTracking.Status.COMPLETED,
            is_favorite=True,
        )
        queryset = (
            Rating.objects.filter(user=user, is_active=True)
            .select_related("content_item", *[
                f"content_item__{field}" for field in CONTENT_RELATED_FIELDS
            ])
            .prefetch_related(*_content_prefetches("content_item__"))
            .annotate(
                is_favorite=Exists(favorite_tracking),
                content_title=Coalesce(
                    "content_item__browse_meta__display_title",
                    Value(""),
                ),
            )
        )
        queryset = _filter_content_queryset(queryset, request)
        kind = request.query_params.get("kind", "all")
        if kind == "reviews":
            queryset = queryset.filter(comment__isnull=False).exclude(comment="")
        elif kind == "ratings_only":
            queryset = queryset.filter(Q(comment__isnull=True) | Q(comment=""))

        favorite = request.query_params.get("favorite")
        if favorite in {"true", "false"}:
            queryset = queryset.filter(is_favorite=favorite == "true")
        min_score = _parse_score_filter(request, "minScore")
        max_score = _parse_score_filter(request, "maxScore")
        if min_score is not None and max_score is not None and min_score > max_score:
            raise ValidationError({
                "maxScore": ["Must be greater than or equal to minScore."]
            })
        if min_score is not None:
            queryset = queryset.filter(score__gte=min_score)
        if max_score is not None:
            queryset = queryset.filter(score__lte=max_score)

        ordering = {
            "oldest": ("created_at", "id"),
            "title": ("content_title", "id"),
            "-title": ("-content_title", "-id"),
            "score": ("score", "id"),
            "-score": ("-score", "-id"),
        }.get(request.query_params.get("sort"), ("-created_at", "-id"))
        page = self.paginate_queryset(queryset.order_by(*ordering))
        data = [
            {
                "id": rating.id,
                "content": _serialize_content(rating.content_item),
                "score": rating.score,
                "review": rating.comment,
                "spoiler": rating.spoiler,
                "is_favorite": rating.is_favorite,
                "created_at": rating.created_at,
                "updated_at": rating.updated_at,
            }
            for rating in page
        ]
        return self.get_paginated_response(data)


def _parse_score_filter(request, name):
    raw_value = request.query_params.get(name)
    if raw_value in {None, ""}:
        return None
    try:
        score = Decimal(raw_value)
    except (InvalidOperation, TypeError, ValueError):
        raise ValidationError({name: ["Must be a number from 0.5 to 10.0."]})
    if score < Decimal("0.5") or score > Decimal("10.0"):
        raise ValidationError({name: ["Must be between 0.5 and 10.0."]})
    return score


def _parse_bool_filter(request, name):
    raw_value = request.query_params.get(name)
    if raw_value in {None, ""}:
        return None
    if raw_value not in {"true", "false"}:
        raise ValidationError({name: ["Must be true or false."]})
    return raw_value == "true"


def _parse_multi_filter(request, name, allowed_values):
    values = []
    for raw_value in request.query_params.getlist(name):
        values.extend(
            value.strip()
            for value in raw_value.split(",")
            if value.strip()
        )
    return list(dict.fromkeys(
        value for value in values if value in allowed_values
    ))


def _progress_ordering(request):
    raw_sort = request.query_params.get("sort", "updated")
    raw_order = request.query_params.get("order")
    legacy_sort = {
        "recent": ("updated", "desc"),
        "oldest": ("updated", "asc"),
        "-title": ("title", "desc"),
        "-score": ("score", "desc"),
    }
    sort_key, legacy_order = legacy_sort.get(
        raw_sort,
        (
            raw_sort if raw_sort in {"updated", "title", "score", "completed"}
            else "updated",
            None,
        ),
    )
    default_order = "asc" if sort_key == "title" else "desc"
    order = (
        raw_order
        if raw_order in {"asc", "desc"}
        else legacy_order or default_order
    )
    field = {
        "updated": "updated_at",
        "title": "content_title",
        "score": "rating_score",
        "completed": "last_completed_at",
    }[sort_key]
    primary = (
        F(field).desc(nulls_last=True)
        if order == "desc"
        else F(field).asc(nulls_last=True)
    )
    return primary, "-id" if order == "desc" else "id"


class PublicProfileListsView(PublicProfileBaseView):
    serializer_class = PublicListSerializer

    @extend_schema(
        tags=["Public Profiles"],
        summary="List public lists for a public profile",
        parameters=[
            OpenApiParameter("q", str),
            OpenApiParameter("role", str, enum=["all", "owner", "member"]),
            OpenApiParameter(
                "sort",
                str,
                enum=["updated", "created", "name"],
            ),
            OpenApiParameter("page", int),
            OpenApiParameter("page_size", int),
        ],
        responses={200: PublicListSerializer(many=True)},
    )
    def get(self, request, username):
        user = self.get_profile_user()
        queryset = (
            _public_lists_queryset(user)
            .select_related("owner")
            .prefetch_related(
                Prefetch("members", queryset=User.objects.only("id", "username"))
            )
            .annotate(
                item_count_annotated=Count("items", distinct=True),
                member_count_annotated=Count("members", distinct=True),
            )
        )
        query = request.query_params.get("q", "").strip()
        if query:
            queryset = queryset.filter(name__icontains=query)
        role = request.query_params.get("role", "all")
        if role == "owner":
            queryset = queryset.filter(owner=user)
        elif role == "member":
            queryset = queryset.exclude(owner=user)
        ordering = {
            "created": ("-created_at", "-id"),
            "name": ("name", "id"),
        }.get(request.query_params.get("sort"), ("-updated_at", "-id"))
        page = self.paginate_queryset(queryset.order_by(*ordering))
        return self.get_paginated_response(
            [_serialize_list(user_list, user) for user_list in page]
        )


class CurrentUserPublicProfileView(generics.GenericAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = UserPublicProfileEditSerializer

    @extend_schema(
        tags=["Public Profiles"],
        summary="Update the current user's public profile",
        request=UserPublicProfileEditSerializer,
        responses={200: PublicProfileIdentitySerializer},
    )
    def patch(self, request):
        profile, _created = UserPublicProfile.objects.get_or_create(user=request.user)
        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(PublicProfileIdentitySerializer(profile).data)


def _filter_content_queryset(queryset, request):
    query = request.query_params.get("q", "").strip()
    if query:
        queryset = queryset.filter(
            content_item__browse_meta__display_title__icontains=query
        )
    content_type = request.query_params.get("type")
    if content_type in ContentItem.ContentType.values:
        queryset = queryset.filter(content_item__content_type=content_type)
    return queryset


def _public_lists_queryset(user):
    ids = (
        UserList.objects.filter(
            Q(owner=user) | Q(members=user),
            visibility=UserList.Visibility.PUBLIC,
        ).exclude(list_type=UserList.ListType.DYNAMIC)
        .order_by()
        .values("id")
        .distinct()
    )
    return UserList.objects.filter(id__in=Subquery(ids))


def _content_map(content_ids):
    if not content_ids:
        return {}
    queryset = ContentItem.objects.filter(id__in=content_ids).select_related(
        *CONTENT_RELATED_FIELDS
    ).prefetch_related(*_content_prefetches())
    return {content.id: content for content in queryset}


def _serialize_content(content):
    return LocalContentSummarySerializer(content).data


def _serialize_completed(row, content_map):
    return {
        "content": _serialize_content(content_map[row["content_item_id"]]),
        "completed_at": row["last_completed_at"],
        "is_favorite": row["is_favorite"],
        "score": row["score"],
    }


def _serialize_rating(row, content_map, *, is_favorite):
    return {
        "id": row["id"],
        "content": _serialize_content(content_map[row["content_item_id"]]),
        "score": row["score"],
        "review": row["comment"],
        "spoiler": row["spoiler"],
        "is_favorite": is_favorite,
        "created_at": row["created_at"],
        "updated_at": row["updated_at"],
    }


def _serialize_list(user_list, profile_user):
    collaborators = [
        {"username": member.username}
        for member in user_list.members.all()
        if member.id != user_list.owner_id
    ]
    member_count = user_list.member_count_annotated
    if user_list.owner_id not in {member.id for member in user_list.members.all()}:
        member_count += 1
    return {
        "id": user_list.id,
        "name": user_list.name,
        "description": user_list.description,
        "list_type": user_list.list_type,
        "visibility": user_list.visibility,
        "role": "owner" if user_list.owner_id == profile_user.id else "member",
        "owner": {"username": user_list.owner.username},
        "collaborators": collaborators,
        "item_count": user_list.item_count_annotated,
        "member_count": member_count,
        "created_at": user_list.created_at,
        "updated_at": user_list.updated_at,
    }


def _select_banner_media(favorite_rows, content_map):
    selected = []
    selected_ids = set()
    selected_types = set()
    for row in favorite_rows:
        content_type = row["content_item__content_type"]
        if content_type in selected_types:
            continue
        selected.append(row)
        selected_ids.add(row["content_item_id"])
        selected_types.add(content_type)
        if len(selected) == 5:
            break
    for row in favorite_rows:
        if len(selected) == 5:
            break
        if row["content_item_id"] not in selected_ids:
            selected.append(row)
            selected_ids.add(row["content_item_id"])

    media = []
    for row in selected:
        content = content_map.get(row["content_item_id"])
        if content is None:
            continue
        preferred = _preferred_banner_option(content)
        if preferred:
            media.append(preferred)
    return media[:5]


def _selected_banner_media(profile, favorite_rows, content_map):
    favorite_ids = {row["content_item_id"] for row in favorite_rows}
    content_id = profile.banner_content_item_id
    if content_id is None or content_id not in favorite_ids:
        return None

    content = content_map.get(content_id)
    if content is None:
        return None

    if profile.banner_image_id is not None:
        image = next(
            (
                candidate
                for candidate in content.images.all()
                if candidate.id == profile.banner_image_id
                and candidate.image_url
            ),
            None,
        )
        if image is None:
            return None
        return _banner_media(
            content,
            image.image_url,
            _banner_treatment(image),
            image.id,
        )

    return _preferred_banner_option(content)


def _select_banner_options(favorite_rows, content_map):
    options = []
    seen_content_ids = set()
    for row in favorite_rows:
        content_id = row["content_item_id"]
        if content_id in seen_content_ids:
            continue
        content = content_map.get(content_id)
        if content is None:
            continue
        seen_content_ids.add(content_id)
        options.extend(_banner_options_for_content(content))
    return options


def _banner_options_for_content(content):
    options = []
    seen_urls = set()
    preferred = _preferred_banner_option(content)
    if preferred:
        options.append({**preferred, "image_id": None})
    for image in _ordered_banner_images(content):
        if image.image_url in seen_urls:
            continue
        seen_urls.add(image.image_url)
        options.append(
            _banner_media(
                content,
                image.image_url,
                _banner_treatment(image),
                image.id,
            )
        )

    summary = _serialize_content(content)
    metadata = {
        "title": summary["title"],
        "authors": _banner_option_authors(content, summary),
    }

    return [{**option, **metadata} for option in options[:12]]


def _banner_option_authors(content, summary):
    if content.content_type == ContentItem.ContentType.ALBUM:
        return _first_two_names(summary.get("subtitle"))

    return [
        author["name"]
        for author in (summary.get("authors") or [])[:2]
        if author.get("name")
    ]


def _first_two_names(value):
    names = [name.strip() for name in (value or "").split(",") if name.strip()]
    return names[:2]


def _preferred_banner_option(content):
    for image in _ordered_banner_images(content):
        return _banner_media(
            content,
            image.image_url,
            _banner_treatment(image),
            image.id,
        )

    summary = _serialize_content(content)
    image_url = summary["poster"] or summary["backdrop"]
    if not image_url:
        return None
    return _banner_media(
        content,
        image_url,
        "contained-poster",
        None,
    )


def _ordered_banner_images(content):
    type_priority = {
        Image.Type.GALLERY: 0,
        Image.Type.POSTER: 1,
    }
    size_priority = {
        Image.Size.ORIGINAL: 0,
        Image.Size.STANDARD: 1,
    }
    return sorted(
        (
            image
            for image in content.images.all()
            if image.image_url
        ),
        key=lambda image: (
            type_priority.get(image.type, 2),
            size_priority.get(image.size, 2),
            image.position,
            image.id,
        ),
    )


def _banner_media(content, image_url, treatment, image_id):
    return {
        "content_id": content.id,
        "type": content.content_type,
        "image_id": image_id,
        "image_url": image_url,
        "treatment": treatment,
    }


def _banner_treatment(image):
    return "cover" if image.type == Image.Type.GALLERY else "contained-poster"
