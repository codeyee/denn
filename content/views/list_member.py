from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from content.models import UserList
from content.serializers import UserSerializer
from content.permissions import IsOwnerOfSharedList

class ListMemberViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_list(self, list_id):
        try:
            user_list = UserList.objects.get(pk=list_id)
            return user_list
        except UserList.DoesNotExist:
            return None

    def list(self, request, list_pk=None):
        user_list = self.get_list(list_pk)

        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not user_list.members.filter(id=request.user.id).exists():
            return Response(
                {'detail': 'No tienes acceso a esta lista.'},
                status=status.HTTP_403_FORBIDDEN
            )

        members = user_list.members.all()
        serializer = UserSerializer(members, many=True)

        return Response({
            'owner': UserSerializer(user_list.owner).data,
            'members': serializer.data
        })

    def destroy(self, request, list_pk=None, pk=None):
        user_list = self.get_list(list_pk)

        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if user_list.list_type != UserList.ListType.SHARED:
            return Response(
                {'detail': 'Solo se pueden eliminar miembros de listas compartidas.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if user_list.owner != request.user:
            return Response(
                {'detail': 'Solo el propietario puede eliminar miembros.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            user_to_remove = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Usuario no encontrado.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if user_to_remove == user_list.owner:
            return Response(
                {'detail': 'El propietario no puede eliminarse de la lista.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not user_list.members.filter(id=user_to_remove.id).exists():
            return Response(
                {'detail': 'El usuario no es miembro de esta lista.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        user_list.members.remove(user_to_remove)

        return Response(
            {'detail': f'Usuario {user_to_remove.username} eliminado de la lista.'},
            status=status.HTTP_204_NO_CONTENT
        )

