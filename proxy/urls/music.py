from django.urls import path
from proxy.views.music import MusicSearchView, MusicAlbumDetailView

app_name = 'music'

urlpatterns = [
    path('search', MusicSearchView.as_view(), name='search'),
    path('<str:album_id>', MusicAlbumDetailView.as_view(), name='album-detail'),
]
