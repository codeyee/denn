from django.contrib.auth.models import User
from drf_spectacular.utils import OpenApiExample, extend_schema
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from content.models import ListMembership, UserList
from content.serializers import (
    ListMembershipRoleSerializer,
    ListMembershipSerializer,
)
from content.services.list_policy import (
    ListAction,
    ListActionPermission,
    can,
    is_collaborative,
)
from content.services.list_service import remove_member


class ListMemberViewSet(viewsets.ViewSet):
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        action = (
            ListAction.MANAGE_MEMBERS
            if self.action in {'destroy', 'update', 'partial_update'}
            else ListAction.VIEW
        )
        return [IsAuthenticated(), ListActionPermission(action)]

    def get_list(self, list_id):
        return (
            UserList.objects.select_related('owner')
            .filter(pk=list_id)
            .first()
        )

    @extend_schema(
        tags=['List Members'],
        summary='List all members of a list',
        description='Get all members of a shared list including the owner and role.',
        responses={
            200: OpenApiExample(
                'Members List',
                value={
                    'owner': {
                        'id': 1,
                        'username': 'john',
                        'email': 'john@example.com',
                        'first_name': 'John',
                        'last_name': 'Doe',
                        'role': 'owner',
                        'is_owner': True,
                    },
                    'members': [],
                },
            ),
        },
    )
    def list(self, request, list_pk=None):
        user_list = self.get_list(list_pk)

        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not is_collaborative(user_list) or not can(
            user_list,
            request.user,
            ListAction.VIEW,
        ):
            return Response(
                {'detail': 'No tienes acceso a esta lista.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        memberships = list(
            ListMembership.objects.filter(user_list=user_list)
            .select_related('user')
            .order_by('role', 'user__username')
        )
        owner_membership = next(
            (
                membership
                for membership in memberships
                if membership.role == ListMembership.Role.OWNER
            ),
            None,
        )

        return Response({
            'owner': (
                ListMembershipSerializer(owner_membership).data
                if owner_membership else None
            ),
            'members': ListMembershipSerializer(memberships, many=True).data,
        })

    @extend_schema(
        tags=['List Members'],
        summary='Remove member from list',
        description='Only the owner can remove a non-owner member.',
        responses={204: OpenApiExample('Success', value={})},
    )
    def destroy(self, request, list_pk=None, pk=None):
        user_list = self.get_list(list_pk)
        if not user_list:
            return Response(
                {'detail': 'Lista no encontrada.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        try:
            user_to_remove = User.objects.get(pk=pk)
        except User.DoesNotExist:
            return Response(
                {'detail': 'Usuario no encontrado.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        ok, error, error_status = remove_member(user_list, user_to_remove)
        if not ok:
            return Response({'detail': error}, status=error_status)

        return Response(status=status.HTTP_204_NO_CONTENT)

    def update(self, request, list_pk=None, pk=None):
        return self._update_role(request, list_pk, pk)

    def partial_update(self, request, list_pk=None, pk=None):
        return self._update_role(request, list_pk, pk)

    @extend_schema(
        tags=['List Members'],
        summary='Change a member role',
        request=ListMembershipRoleSerializer,
        responses={200: ListMembershipSerializer},
    )
    def _update_role(self, request, list_pk, pk):
        user_list = self.get_list(list_pk)
        if not user_list or not is_collaborative(user_list):
            return Response(
                {'detail': 'Solo las listas compartidas tienen roles de membresía.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        membership = (
            ListMembership.objects.select_related('user')
            .filter(user_list=user_list, user_id=pk)
            .first()
        )
        if membership is None:
            return Response(
                {'detail': 'El usuario no es miembro de la lista.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        if membership.role == ListMembership.Role.OWNER:
            return Response(
                {'detail': 'El owner no puede cambiarse mediante este endpoint.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = ListMembershipRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        membership.role = serializer.validated_data['role'].upper()
        membership.save(update_fields=['role'])
        return Response(ListMembershipSerializer(membership).data)
