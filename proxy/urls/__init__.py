from django.urls import path, include

app_name = 'proxy'

urlpatterns = [
    path('video/', include('proxy.urls.tmdb', namespace='video')),
    # path('games/', include('proxy.urls.igdb', namespace='games')),
    # path('music/', include('proxy.urls.music', namespace='music')),
    # path('books/', include('proxy.urls.rawg', namespace='books')),
]
