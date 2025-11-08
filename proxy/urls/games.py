from django.urls import path
from proxy.views.games import GamesSearchView, GamesBulkView

app_name = 'games'

urlpatterns = [
    path(
        'search',
        GamesSearchView.as_view(),
        name='search'
    ),
    path(
        'bulk',
        GamesBulkView.as_view(),
        name='games-bulk'
    ),
]
