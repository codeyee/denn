from django.urls import path, include
from proxy.views import HomepageView

app_name = 'proxy'

urlpatterns = [
    path('homepage/', HomepageView.as_view(), name='homepage'),
    path('video/', include('proxy.urls.video', namespace='video')),
    path('game/', include('proxy.urls.games', namespace='games')),
    path('music/', include('proxy.urls.music', namespace='music')),
    path('book/', include('proxy.urls.book', namespace='book')),
]
