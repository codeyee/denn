from django.urls import path
from proxy.views.games import GamesSearchView, GamesBulkView, GamesSuggestionsView

app_name = 'games'

urlpatterns = [
    path(
        'search',
        GamesSearchView.as_view(),
        name='search'
    ),
    path(
        'suggestions',
        GamesSuggestionsView.as_view(),
        name='suggestions'
    ),
    path(
        'bulk',
        GamesBulkView.as_view(),
        name='games-bulk'
    ),
]
