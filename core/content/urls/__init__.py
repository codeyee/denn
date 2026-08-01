from django.urls import path, include

from content.views import (
    ContentItemDetailByIdView,
    ContentItemBulkResolveView,
    ContentItemGetOrCreateView,
    LegacyContentRedirectView,
    UserContentFavoriteView,
    UserContentTrackingRandomView,
    UserContentTrackingView,
)

app_name = 'content'

urlpatterns = [
    path('items/', include('content.urls.content_items', namespace='content_items')),
    path('lists/', include('content.urls.lists', namespace='lists')),
    path('dynamic-collections/', include('content.urls.dynamic_collections')),
    path('ratings/', include('content.urls.ratings', namespace='ratings')),
    path('invitations/', include('content.urls.invitations', namespace='invitations')),

    path('get-or-create/', ContentItemGetOrCreateView.as_view(), name='content-get-or-create'),
    path('resolve-ids/', ContentItemBulkResolveView.as_view(), name='content-resolve-ids'),
    path(
        'tracking/random/',
        UserContentTrackingRandomView.as_view(),
        name='content-tracking-random',
    ),
    path(
        'tracking/<int:content_id>/',
        UserContentTrackingView.as_view(),
        name='content-tracking',
    ),
    path(
        'tracking/<int:content_id>/favorite/',
        UserContentFavoriteView.as_view(),
        name='content-tracking-favorite',
    ),
    path('<int:id>/', ContentItemDetailByIdView.as_view(), name='content-detail-by-id'),
    path('', LegacyContentRedirectView.as_view(), name='content-legacy-redirect'),
]
