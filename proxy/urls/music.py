from django.urls import path
from proxy.views.music import MusicSearchView, MusicAlbumDetailView, MusicBulkAlbumsView

app_name = 'music'

urlpatterns = [
    path('search', MusicSearchView.as_view(), name='search'),
    path('bulk', MusicBulkAlbumsView.as_view(), name='albums-bulk'),
    path('<str:album_id>', MusicAlbumDetailView.as_view(), name='album-detail'),
]
