from django.urls import path, include

app_name = 'content'

urlpatterns = [
    path('lists/', include('content.urls.lists', namespace='lists')),
    path('ratings/', include('content.urls.ratings', namespace='ratings')),
]
