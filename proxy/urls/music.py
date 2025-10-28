from django.urls import path
from proxy.views.music import MusicSearchView, MusicAlbumDetailView, MusicBulkAlbumsView, MusicSuggestionsView

app_name = 'music'

urlpatterns = [
    path('search', MusicSearchView.as_view(), name='search'),
    path('suggestions', MusicSuggestionsView.as_view(), name='suggestions'),
    path('bulk', MusicBulkAlbumsView.as_view(), name='albums-bulk'),
    path('<str:album_id>', MusicAlbumDetailView.as_view(), name='album-detail'),
]
