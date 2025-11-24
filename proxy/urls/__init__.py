from django.urls import path, include
from proxy.views import HomepageView
from proxy.views.search import MultiSearchView

app_name = 'proxy'

urlpatterns = [
    path('homepage/', HomepageView.as_view(), name='homepage'),
    path('search/multi/', MultiSearchView.as_view(), name='multi-search'),
    path('movies/', include('proxy.urls.movies', namespace='movies')),
    path('tv-shows/', include('proxy.urls.tv_shows', namespace='tv-shows')),
    path('albums/', include('proxy.urls.albums', namespace='albums')),
    path('games/', include('proxy.urls.games', namespace='games')),
    path('books/', include('proxy.urls.books', namespace='books')),
]
