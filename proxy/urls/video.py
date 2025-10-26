from django.urls import path
from proxy.views.video import (
    VideoSearchView,
    VideoMovieDetailView,
    VideoTvDetailView,
    VideoTvSeasonDetailView
)

app_name = 'video'

urlpatterns = [
    path(
        'search',
        VideoSearchView.as_view(),
        name='search'
    ),
    path(
        'movie/<int:movie_id>',
        VideoMovieDetailView.as_view(),
        name='movie-detail'
    ),
    path(
        'tv/<int:tv_id>',
        VideoTvDetailView.as_view(),
        name='tv-detail'
    ),
    path(
        'tv/<int:tv_id>/season/<int:season_number>',
        VideoTvSeasonDetailView.as_view(),
        name='season-detail'
    ),
]
