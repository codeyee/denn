from django.urls import path, include

app_name = 'proxy'

urlpatterns = [
    path('video/', include('proxy.urls.video', namespace='video')),
    path('games/', include('proxy.urls.games', namespace='games')),
    path('music/', include('proxy.urls.music', namespace='music')),
    path('books/', include('proxy.urls.books', namespace='books')),
]
