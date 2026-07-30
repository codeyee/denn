from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiExample, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from content.models import ListInvitation, UserList
from content.serializers import (
    ListInvitationSerializer,
    ListInvitationCreateSerializer,
    ListInvitationResponseSerializer
)
from rest_flex_fields.views import FlexFieldsMixin
from content.services.list_policy import ListAction, ListActionPermission, can, is_collaborative
from content.services.list_service import add_member

@extend_schema_view(
    list=extend_schema(
        tags=['List Invitations'],
        summary='List invitations',
        description='''
        List invitations received or sent by the current user.

        **Query Parameters:**
        - `sent=true`: Show invitations sent by the user
        - `list_id`: Filter by specific list (owner only)
        - `status`: Filter by invitation status (PENDING)

        **Dynamic Fields (drf-flex-fields):**
        - `fields`: Comma-separated list of fields to include
        - `omit`: Comma-separated list of fields to exclude
        - `expand`: Expand relationships (inviter, invitee, user_list)

        **Examples:**
        - `?fields=id,status,created_at` - Return only basic invitation info
        - `?expand=user_list` - Expand list details
        - `?expand=inviter,invitee&fields=id,inviter,invitee` - Expand users and limit fields
        ''',
        parameters=[
            OpenApiParameter('sent', OpenApiTypes.BOOL, description='Show sent invitations instead of received'),
            OpenApiParameter('list_id', OpenApiTypes.INT, description='Filter by list ID'),
            OpenApiParameter('status', OpenApiTypes.STR, description='Filter by status', enum=['PENDING']),
            OpenApiParameter('fields', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to include'),
            OpenApiParameter('omit', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Comma-separated list of fields to exclude'),
            OpenApiParameter('expand', OpenApiTypes.STR, OpenApiParameter.QUERY, required=False, description='Expand relationships (e.g., "inviter,invitee,user_list")'),
        ],
        responses={200: ListInvitationSerializer(many=True)}
    ),
    retrieve=extend_schema(
        tags=['List Invitations'],
        summary='Get invitation details',
        description='Get details of a specific invitation.',
        responses={200: ListInvitationSerializer}
    ),
    create=extend_schema(
        tags=['List Invitations'],
        summary='Send invitation',
        description='''
        Send an invitation to a user to join a shared list.

        Only the list owner can send invitations. The user can be specified by username or email.
        ''',
        request=ListInvitationCreateSerializer,
        responses={
            201: ListInvitationSerializer,
            400: OpenApiExample('Bad Request', value={'detail': 'Only shared lists can have invitations.'}),
            403: OpenApiExample('Forbidden', value={'detail': 'Only the list owner can send invitations.'}),
            404: OpenApiExample('Not Found', value={'detail': 'List not found.'})
        },
        examples=[
            OpenApiExample(
                'Invite by Username',
                value={'username': 'maria'},
                request_only=True
            ),
            OpenApiExample(
                'Invite by Email',
                value={'email': 'maria@example.com'},
                request_only=True
            )
        ]
    ),
    destroy=extend_schema(
        tags=['List Invitations'],
        summary='Cancel invitation',
        description='Cancel a pending invitation. Only the inviter or list owner can cancel.',
        responses={
            204: OpenApiExample('Success', value={'detail': 'Invitation cancelled.'}),
            403: OpenApiExample('Forbidden', value={'detail': 'Only the inviter or list owner can delete this invitation.'})
        }
    )
)
class ListInvitationViewSet(FlexFieldsMixin, viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    permit_list_expands = ['inviter', 'invitee', 'user_list']

    def get_permissions(self):
        if self.action == 'create':
            return [IsAuthenticated(), ListActionPermission(ListAction.INVITE)]
        return [IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        queryset = ListInvitation.objects.select_related(
            'inviter', 'invitee', 'user_list'
        ).order_by('-created_at')

        if self.action in ['retrieve', 'destroy', 'respond']:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(invitee=user) | Q(inviter=user) | Q(user_list__owner=user)
            )
            return queryset

        list_id = self.request.query_params.get('list_id')
        if list_id:
            try:
                user_list = UserList.objects.get(pk=list_id, owner=user)
                queryset = queryset.filter(user_list=user_list)
            except UserList.DoesNotExist:
                return queryset.none()

        elif self.request.query_params.get('sent') == 'true':
            queryset = queryset.filter(inviter=user)

        else:
            queryset = queryset.filter(invitee=user)

        invitation_status = self.request.query_params.get('status')
        if invitation_status:
            queryset = queryset.filter(status=invitation_status)

        return queryset

    def get_serializer_class(self):
        if self.action == 'create':
            return ListInvitationCreateSerializer
        elif self.action == 'respond':
            return ListInvitationResponseSerializer
        return ListInvitationSerializer

    def create(self, request, list_pk=None):
        try:
            user_list = UserList.objects.get(pk=list_pk)
        except UserList.DoesNotExist:
            return Response(
                {'detail': 'List not found.'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not can(user_list, request.user, ListAction.INVITE):
            return Response(
                {'detail': 'Only the list owner can send invitations.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if not is_collaborative(user_list):
            return Response(
                {'detail': 'Only shared lists can have invitations.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(
            data=request.data,
            context={
                'request': request,
                'user_list': user_list
            }
        )
        serializer.is_valid(raise_exception=True)

        invitation = serializer.save(
            inviter=request.user,
            user_list=user_list
        )

        return Response(
            ListInvitationSerializer(invitation).data,
            status=status.HTTP_201_CREATED
        )

    @extend_schema(
        tags=['List Invitations'],
        summary='Respond to invitation',
        description='''
        Accept or reject a list invitation.

        Only the invitee can respond to their own invitations.
        After responding, the invitation is automatically deleted.
        ''',
        request=ListInvitationResponseSerializer,
        responses={
            200: OpenApiExample(
                'Accepted',
                value={'detail': 'Invitation accepted. You are now a member of "Family Movies".'}
            ),
            400: OpenApiExample('Already Responded', value={'detail': 'This invitation has already been responded to.'}),
            403: OpenApiExample('Forbidden', value={'detail': 'You can only respond to your own invitations.'})
        },
        examples=[
            OpenApiExample(
                'Accept Invitation',
                value={'action': 'accept'},
                request_only=True
            ),
            OpenApiExample(
                'Reject Invitation',
                value={'action': 'reject'},
                request_only=True
            )
        ]
    )
    @action(detail=True, methods=['post'])
    @transaction.atomic
    def respond(self, request, pk=None):
        invitation = self.get_object()

        if invitation.invitee != request.user:
            return Response(
                {'detail': 'You can only respond to your own invitations.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if invitation.status != ListInvitation.Status.PENDING:
            return Response(
                {'detail': 'This invitation has already been responded to.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        action_type = serializer.validated_data['action']
        list_name = invitation.user_list.name

        if action_type == 'accept':
            add_member(
                invitation.user_list,
                invitation.invitee,
                invitation.role,
            )
            invitation.delete()

            return Response(
                {
                    'detail': f'Invitation accepted. You are now a member of "{list_name}".'
                },
                status=status.HTTP_200_OK
            )
        else:
            invitation.delete()

            return Response(
                {
                    'detail': 'Invitation rejected.'
                },
                status=status.HTTP_200_OK
            )

    def destroy(self, request, *args, **kwargs):
        invitation = self.get_object()

        if invitation.inviter != request.user and not can(
            invitation.user_list,
            request.user,
            ListAction.INVITE,
        ):
            return Response(
                {'detail': 'Only the inviter or list owner can delete this invitation.'},
                status=status.HTTP_403_FORBIDDEN
            )

        invitation.delete()

        return Response(
            {'detail': 'Invitation cancelled.'},
            status=status.HTTP_204_NO_CONTENT
        )
