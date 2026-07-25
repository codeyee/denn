from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from content.models import ContentItem
from content.serializers import (
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
        )
        transition.tracking.should_prompt_rating = transition.should_prompt_rating
        return Response(UserContentTrackingSerializer(transition.tracking).data)

    @extend_schema(
        tags=["Tracking"],
        summary="Delete the current user's tracking state",
        responses={204: None},
    )
    def delete(self, request, content_id):
        content_item = get_object_or_404(
            ContentItem.objects.select_related("season_detail__tv_show"),
            pk=content_id,
        )
        delete_tracking(user=request.user, content_item=content_item)
        return Response(status=status.HTTP_204_NO_CONTENT)


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
