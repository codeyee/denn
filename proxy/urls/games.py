from django.urls import path
from proxy.views.games import (
    GamesSearchView,
    GamesGameDetailView
)

app_name = 'games'

urlpatterns = [
    path(
        'search',
        GamesSearchView.as_view(),
        name='search'
    ),
    path(
        '<int:game_id>',
        GamesGameDetailView.as_view(),
        name='game-detail'
    ),
]
