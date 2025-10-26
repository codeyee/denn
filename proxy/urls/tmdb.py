"""
TMDB API proxy URL patterns.
All TMDB-related endpoints are defined here.
"""
from django.urls import path
from proxy.views.tmdb import (
    TMDBSearchView,
    TMDBMovieDetailView,
    TMDBTVDetailView,
    TMDBSeasonDetailView
)


app_name = 'tmdb'

urlpatterns = [
    path(
        'search',
        TMDBSearchView.as_view(),
        name='search'
    ),
    path(
        'movie/<int:movie_id>',
        TMDBMovieDetailView.as_view(),
        name='movie-detail'
    ),
    path(
        'tv/<int:tv_id>',
        TMDBTVDetailView.as_view(),
        name='tv-detail'
    ),
    path(
        'tv/<int:tv_id>/season/<int:season_number>',
        TMDBSeasonDetailView.as_view(),
        name='season-detail'
    ),
]

