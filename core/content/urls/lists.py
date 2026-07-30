from django.urls import path, include
from rest_framework.routers import DefaultRouter

from content.views import (
    UserListViewSet,
    ListItemViewSet,
    ListMemberViewSet,
    ListInvitationViewSet,
)

app_name = 'lists'

router = DefaultRouter()
router.register(r'', UserListViewSet, basename='list')

list_item_list = ListItemViewSet.as_view({
    'get': 'list',
    'post': 'create'
})

list_item_detail = ListItemViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy'
})

list_item_reorder = ListItemViewSet.as_view({
    'post': 'reorder'
})

list_item_move = ListItemViewSet.as_view({
    'post': 'move'
})

list_item_apply_sort = ListItemViewSet.as_view({
    'post': 'apply_sort'
})

list_member_list = ListMemberViewSet.as_view({
    'get': 'list'
})

list_member_detail = ListMemberViewSet.as_view({
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy'
})

list_invitation_list = ListInvitationViewSet.as_view({
    'get': 'list',
    'post': 'create'
})

urlpatterns = [
    path('', include(router.urls)),

    path(
        '<int:list_pk>/items/',
        list_item_list,
        name='items-list'
    ),
    path(
        '<int:list_pk>/items/<int:pk>/',
        list_item_detail,
        name='items-detail'
    ),
    path(
        '<int:list_pk>/items/reorder/',
        list_item_reorder,
        name='items-reorder'
    ),
    path(
        '<int:list_pk>/items/<int:pk>/move/',
        list_item_move,
        name='items-move'
    ),
    path(
        '<int:list_pk>/items/apply-sort/',
        list_item_apply_sort,
        name='items-apply-sort'
    ),
    path(
        '<int:list_pk>/members/',
        list_member_list,
        name='members-list'
    ),
    path(
        '<int:list_pk>/members/<int:pk>/',
        list_member_detail,
        name='members-detail'
    ),
    path(
        '<int:list_pk>/invitations/',
        list_invitation_list,
        name='invitations-list'
    ),
]
