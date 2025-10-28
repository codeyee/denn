from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.auth.models import User
from drf_spectacular.utils import extend_schema, OpenApiExample
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

    @extend_schema(
        tags=['List Members'],
        summary='List all members of a list',
        description='Get all members of a shared list including the owner.',
        responses={
            200: OpenApiExample(
                'Members List',
                value={
                    'owner': {
                        'id': 1,
                        'username': 'john',
                        'email': 'john@example.com',
                        'first_name': 'John',
                        'last_name': 'Doe'
                    },
                    'members': [
                        {
                            'id': 1,
                            'username': 'john',
                            'email': 'john@example.com',
                            'first_name': 'John',
                            'last_name': 'Doe'
                        },
                        {
                            'id': 2,
                            'username': 'maria',
                            'email': 'maria@example.com',
                            'first_name': 'Maria',
                            'last_name': 'Garcia'
                        }
                    ]
                }
            ),
            403: OpenApiExample('Forbidden', value={'detail': 'No tienes acceso a esta lista.'}),
            404: OpenApiExample('Not Found', value={'detail': 'Lista no encontrada.'})
        }
    )
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

    @extend_schema(
        tags=['List Members'],
        summary='Remove member from list',
        description='''
        Remove a member from a shared list.

        Only the list owner can remove members. The owner cannot remove themselves.
        ''',
        responses={
            204: OpenApiExample('Success', value={'detail': 'Usuario maria eliminado de la lista.'}),
            400: OpenApiExample('Bad Request', value={'detail': 'Solo se pueden eliminar miembros de listas compartidas.'}),
            403: OpenApiExample('Forbidden', value={'detail': 'Solo el propietario puede eliminar miembros.'}),
            404: OpenApiExample('Not Found', value={'detail': 'Usuario no encontrado.'})
        }
    )
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

