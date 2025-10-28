from django.urls import path
from proxy.views.video import (
    VideoSearchView,
    VideoMovieDetailView,
    VideoTvDetailView,
    VideoTvSeasonDetailView,
    VideoBulkMoviesView,
    VideoBulkTvShowsView,
    VideoBulkSeasonsView
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
        'movies/bulk',
        VideoBulkMoviesView.as_view(),
        name='movies-bulk'
    ),
    path(
        'tv/<int:tv_id>',
        VideoTvDetailView.as_view(),
        name='tv-detail'
    ),
    path(
        'tv/bulk',
        VideoBulkTvShowsView.as_view(),
        name='tv-bulk'
    ),
    path(
        'tv/<int:tv_id>/season/<int:season_number>',
        VideoTvSeasonDetailView.as_view(),
        name='season-detail'
    ),
    path(
        'seasons/bulk',
        VideoBulkSeasonsView.as_view(),
        name='seasons-bulk'
    ),
]
