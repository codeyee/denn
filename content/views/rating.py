from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Avg, Count
from content.models import Rating, ContentItem
from content.serializers import RatingSerializer, RatingCreateSerializer
from content.permissions import IsOwnerOfRating

class RatingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Rating.objects.select_related('user', 'content_item').order_by('-created_at')

        content_item_id = self.request.query_params.get('content_item_id')
        if content_item_id:
            queryset = queryset.filter(content_item_id=content_item_id)

        user_id = self.request.query_params.get('user_id')
        if user_id: queryset = queryset.filter(user_id=user_id)

        source_api = self.request.query_params.get('source_api')
        external_id = self.request.query_params.get('external_id')

        if source_api and external_id:
            try:
                content_item = ContentItem.objects.get(
                    source_api=source_api,
                    external_id=external_id
                )
                queryset = queryset.filter(content_item=content_item)
            except ContentItem.DoesNotExist:
                queryset = queryset.none()

        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return RatingCreateSerializer

        return RatingSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwnerOfRating()]

        return [IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        rating = serializer.save(user=request.user)

        return Response(
            RatingSerializer(rating).data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()

        data = {
            'score': request.data.get('score', instance.score),
            'comment': request.data.get('comment', instance.comment),
            'source_api': instance.content_item.source_api,
            'external_id': instance.content_item.external_id,
            'content_type': instance.content_item.content_type,
        }

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save(user=request.user)

        return Response(RatingSerializer(instance).data)

    def list(self, request, *args, **kwargs):

        queryset = self.get_queryset()

        if request.query_params.get('stats_only') == 'true':
            content_item_id = request.query_params.get('content_item_id')
            source_api = request.query_params.get('source_api')
            external_id = request.query_params.get('external_id')

            if not content_item_id and not (source_api and external_id):
                return Response(
                    {'detail': 'Debes proporcionar content_item_id o (source_api y external_id).'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            stats = queryset.aggregate(
                average_score=Avg('score'),
                total_ratings=Count('id')
            )

            return Response(stats)

        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)

        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

