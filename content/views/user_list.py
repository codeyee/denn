from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from content.models import UserList
from content.serializers import UserListSerializer, UserListDetailSerializer
from content.permissions import IsOwnerOrReadOnly, IsMemberOfList

class UserListViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        return UserList.objects.filter(
            Q(owner=user) | Q(members=user)
        ).distinct().prefetch_related(
            'members',
            'items__content_item',
            'items__added_by',
            'items__content_item__ratings__user'
        )

    def get_serializer_class(self):
        if self.action == 'retrieve':
            return UserListDetailSerializer
        return UserListSerializer

    def get_permissions(self):
        if self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwnerOrReadOnly()]

        elif self.action == 'retrieve':
            return [IsAuthenticated(), IsMemberOfList()]

        return [IsAuthenticated()]

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    @action(detail=True, methods=['get'])
    def stats(self, request, pk=None):
        user_list = self.get_object()

        if not user_list.members.filter(id=request.user.id).exists():
            return Response(
                {'detail': 'No tienes permiso para ver las estadísticas de esta lista.'},
                status=status.HTTP_403_FORBIDDEN
            )

        stats = {
            'total_items': user_list.items.count(),
            'pending_items': user_list.items.filter(status='PENDING').count(),
            'completed_items': user_list.items.filter(status='COMPLETED').count(),
            'member_count': user_list.members.count(),
            'content_types': {}
        }

        for item in user_list.items.all():
            content_type = item.content_item.content_type

            if content_type not in stats['content_types']:
                stats['content_types'][content_type] = 0

            stats['content_types'][content_type] += 1

        return Response(stats)
