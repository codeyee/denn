from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from content.models import ListItem, UserList
from content.serializers import ListItemSerializer, ListItemCreateSerializer
from content.permissions import IsMemberOfList

class ListItemViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsMemberOfList]

    def get_queryset(self):
        list_id = self.kwargs.get('list_pk')
        return ListItem.objects.filter(
            user_list_id=list_id
        ).select_related(
            'content_item',
            'added_by',
            'user_list'
        ).order_by('-added_at')

    def get_serializer_class(self):
        if self.action == 'create': return ListItemCreateSerializer
        return ListItemSerializer

    def get_list(self):
        list_id = self.kwargs.get('list_pk')
        try:
            user_list = UserList.objects.get(pk=list_id)

            if not user_list.members.filter(id=self.request.user.id).exists():
                return None

            return user_list
        except UserList.DoesNotExist:
            return None

    def create(self, request, *args, **kwargs):
        user_list = self.get_list()

        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada o no tienes acceso a ella.'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        serializer.save(
            user_list=user_list,
            added_by=request.user
        )

        return Response(
            ListItemSerializer(serializer.instance).data,
            status=status.HTTP_201_CREATED
        )

    def update(self, request, *args, **kwargs):
        user_list = self.get_list()

        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada o no tienes acceso a ella.'},
                status=status.HTTP_404_NOT_FOUND
            )

        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(serializer.data)

    def destroy(self, request, *args, **kwargs):
        user_list = self.get_list()

        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada o no tienes acceso a ella.'},
                status=status.HTTP_404_NOT_FOUND
            )

        instance = self.get_object()
        instance.delete()

        return Response(status=status.HTTP_204_NO_CONTENT)

