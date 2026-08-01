from django.shortcuts import get_object_or_404
from django.db.models import Prefetch
from drf_spectacular.utils import extend_schema, OpenApiParameter
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from secrets import randbelow

from content.models import ContentItem, ContentItemAuthor, Image, UserContentTracking
from content.serializers import (
    RandomSelectionRequestSerializer,
    RandomTrackingPickSerializer,
    TrackingFavoriteSerializer,
    TrackingStatusSerializer,
    UserContentTrackingSerializer,
)
from content.services.tracking_service import (
    delete_tracking,
    set_favorite,
    transition_tracking,
)


class UserContentTrackingView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Tracking"],
        summary="Set the current user's tracking state",
        request=TrackingStatusSerializer,
        responses={200: UserContentTrackingSerializer},
    )
    def put(self, request, content_id):
        content_item = get_object_or_404(
            ContentItem.objects.select_related("season_detail__tv_show"),
            pk=content_id,
        )
        serializer = TrackingStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        transition = transition_tracking(
            user=request.user,
            content_item=content_item,
            status=serializer.validated_data["status"],
            acknowledge_effects=serializer.validated_data["acknowledge_effects"],
        )
        transition.tracking.should_prompt_rating = transition.should_prompt_rating
        transition.tracking.effects = list(transition.effects)
        return Response(UserContentTrackingSerializer(transition.tracking).data)

    @extend_schema(
        tags=["Tracking"],
        summary="Delete the current user's tracking state",
        parameters=[
            OpenApiParameter(
                "acknowledge_effects",
                bool,
                description=(
                    "Required when deletion archives a rating/review or "
                    "removes a favorite."
                ),
            )
        ],
        responses={204: None},
    )
    def delete(self, request, content_id):
        content_item = get_object_or_404(
            ContentItem.objects.select_related("season_detail__tv_show"),
            pk=content_id,
        )
        delete_tracking(
            user=request.user,
            content_item=content_item,
            acknowledge_effects=(
                request.query_params.get("acknowledge_effects", "").lower()
                == "true"
            ),
        )
        return Response(status=status.HTTP_204_NO_CONTENT)


class UserContentTrackingRandomView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Tracking"],
        summary="Choose a random item from the current user's backlog",
        request=RandomSelectionRequestSerializer,
        responses={200: RandomTrackingPickSerializer},
    )
    def post(self, request):
        serializer = RandomSelectionRequestSerializer(data=request.data or {})
        serializer.is_valid(raise_exception=True)
        excluded_ids = serializer.validated_data["exclude_content_ids"]
        queryset = (
            UserContentTracking.objects.filter(
                user=request.user,
                status=UserContentTracking.Status.BACKLOG,
            )
            .exclude(content_item_id__in=excluded_ids)
            .select_related(
                "content_item__browse_meta",
                "content_item__movie_detail",
                "content_item__tv_show_detail",
                "content_item__season_detail__tv_show",
                "content_item__game_detail",
                "content_item__album_detail",
                "content_item__book_detail",
            )
            .prefetch_related(
                Prefetch(
                    "content_item__images",
                    queryset=Image.objects.order_by("position", "id"),
                ),
                Prefetch(
                    "content_item__content_authors",
                    queryset=ContentItemAuthor.objects.select_related("author")
                    .order_by("position", "id"),
                ),
            )
        )
        count = queryset.count()
        if count == 0:
            return Response({"result": None})

        tracking = queryset.order_by("id")[randbelow(count)]
        return Response({"result": RandomTrackingPickSerializer(tracking).data})


class UserContentFavoriteView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=["Tracking"],
        summary="Set or clear a favorite",
        request=TrackingFavoriteSerializer,
        responses={200: UserContentTrackingSerializer},
    )
    def patch(self, request, content_id):
        content_item = get_object_or_404(
            ContentItem.objects.select_related("season_detail__tv_show"),
            pk=content_id,
        )
        serializer = TrackingFavoriteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tracking = set_favorite(
            user=request.user,
            content_item=content_item,
            is_favorite=serializer.validated_data["is_favorite"],
        )
        return Response(UserContentTrackingSerializer(tracking).data)
