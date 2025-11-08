from django.urls import path
from proxy.views.albums import AlbumSearchView, AlbumDetailView, AlbumBulkView

app_name = 'albums'

urlpatterns = [
    path('search', AlbumSearchView.as_view(), name='search'),
    path('bulk', AlbumBulkView.as_view(), name='bulk'),
    path('<str:album_id>', AlbumDetailView.as_view(), name='detail'),
]
