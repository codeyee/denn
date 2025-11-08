from django.urls import path
from proxy.views.tv_shows import (
    TVShowSearchView,
    TVShowDetailView,
    TVShowBulkView,
    TVSeasonDetailView,
)

app_name = 'tv_shows'

urlpatterns = [
    path(
        '<int:tv_id>',
        TVShowDetailView.as_view(),
        name='detail'
    ),
    path(
        '<int:tv_id>/season/<int:season_number>',
        TVSeasonDetailView.as_view(),
        name='season-detail'
    ),
    path(
        'search',
        TVShowSearchView.as_view(),
        name='search'
    ),
    path(
        'bulk',
        TVShowBulkView.as_view(),
        name='bulk'
    ),
]
