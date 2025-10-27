from django.urls import path
from content.views import ListInvitationViewSet

app_name = 'invitations'

list_invitations_list = ListInvitationViewSet.as_view({
    'get': 'list',
})

invitation_respond = ListInvitationViewSet.as_view({
    'post': 'respond',
})

invitation_detail = ListInvitationViewSet.as_view({
    'get': 'retrieve',
    'delete': 'destroy',
})

urlpatterns = [
    path('', list_invitations_list, name='list'),
    path('<int:pk>/', invitation_detail, name='detail'),
    path('<int:pk>/respond/', invitation_respond, name='respond'),
]

