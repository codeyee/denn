from django.urls import path, include

app_name = 'content'

urlpatterns = [
    path('items/', include('content.urls.content_items', namespace='content_items')),
    path('lists/', include('content.urls.lists', namespace='lists')),
    path('ratings/', include('content.urls.ratings', namespace='ratings')),
    path('invitations/', include('content.urls.invitations', namespace='invitations')),
]
