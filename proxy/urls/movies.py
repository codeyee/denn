from django.urls import path
from proxy.views.movies import (
    MovieSearchView,
    MovieDetailView,
    MovieBulkView,
)

app_name = 'movies'

urlpatterns = [
    path(
        '<int:movie_id>',
        MovieDetailView.as_view(),
        name='detail'
    ),
    path(
        'search',
        MovieSearchView.as_view(),
        name='search'
    ),
    path(
        'bulk',
        MovieBulkView.as_view(),
        name='bulk'
    ),
]
