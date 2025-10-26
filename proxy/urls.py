from django.urls import path
from django.urls import include
from proxy.views.tmdb import (
    TMDBSearchView,
    TMDBMovieDetailView,
    TMDBTVDetailView,
    TMDBSeasonDetailView
)

app_name = 'proxy'

video_patterns = [
    path(
        'search',
        TMDBSearchView.as_view(),
        name='tmdb-search'
    ),
    path(
        'movie/<int:movie_id>',
        TMDBMovieDetailView.as_view(),
        name='tmdb-movie-detail'
    ),
    path(
        'tv/<int:tv_id>',
        TMDBTVDetailView.as_view(),
        name='tmdb-tv-detail'
    ),
    path(
        'tv/<int:tv_id>/season/<int:season_number>',
        TMDBSeasonDetailView.as_view(),
        name='tmdb-season-detail'
    )
]
urlpatterns = [
    path('video/', include(video_patterns)),
]

