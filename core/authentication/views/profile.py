from collections import defaultdict

from django.contrib.auth.models import User
from django.db.models import Count, Exists, OuterRef, Prefetch, Q, Subquery, Value
from django.db.models.functions import Coalesce
from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, extend_schema
from rest_framework import generics
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from authentication.models import UserPublicProfile
from authentication.serializers import (
    PublicCompletedItemSerializer,
    PublicListSerializer,
    PublicProfileIdentitySerializer,
    PublicProfileOverviewSerializer,
    PublicRatingItemSerializer,
    UserPublicProfileEditSerializer,
)
from content.models import ContentItem, Rating, UserContentTracking, UserList
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


def _profile_filter_parameters(*extra):
    return [
        OpenApiParameter("q", str),
        OpenApiParameter("type", str, enum=ContentItem.ContentType.values),
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

        rating_counts = Rating.objects.filter(
            user=user,
            is_active=True,
        ).aggregate(
            ratings=Count("id"),
            reviews=Count(
                "id",
                filter=Q(comment__isnull=False) & ~Q(comment=""),
            ),
        )

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
        public_list_count = public_lists.count()
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

        payload = {
            "profile": PublicProfileIdentitySerializer(profile).data,
            "counters": {
                "completed": completed_count,
                "ratings": rating_counts["ratings"],
                "reviews": rating_counts["reviews"],
                "public_lists": public_list_count,
                "completed_by_type": completed_by_type,
            },
            "favorites": dict(favorites),
            "recent_reviews": recent_reviews,
            "recent_completed": recent_completed,
            "public_lists": serialized_lists,
            "banner_media": banner_media,
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
        if request.query_params.get("minScore"):
            queryset = queryset.filter(score__gte=request.query_params["minScore"])
        if request.query_params.get("maxScore"):
            queryset = queryset.filter(score__lte=request.query_params["maxScore"])

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
        )
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
    )
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
        summary = _serialize_content(content)
        image_url = summary["backdrop"] or summary["poster"]
        if image_url:
            media.append(
                {
                    "content_id": content.id,
                    "type": content.content_type,
                    "image_url": image_url,
                }
            )
    return media[:5]
