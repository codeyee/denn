from django.urls import path, include

from content.views import (
    ContentItemDetailByIdView,
    ContentItemBulkResolveView,
    ContentItemGetOrCreateView,
    LegacyContentRedirectView,
)

app_name = 'content'

urlpatterns = [
    path('items/', include('content.urls.content_items', namespace='content_items')),
    path('lists/', include('content.urls.lists', namespace='lists')),
    path('ratings/', include('content.urls.ratings', namespace='ratings')),
    path('invitations/', include('content.urls.invitations', namespace='invitations')),

    path('get-or-create/', ContentItemGetOrCreateView.as_view(), name='content-get-or-create'),
    path('resolve-ids/', ContentItemBulkResolveView.as_view(), name='content-resolve-ids'),
    path('<int:id>/', ContentItemDetailByIdView.as_view(), name='content-detail-by-id'),
    path('', LegacyContentRedirectView.as_view(), name='content-legacy-redirect'),
]
