from django.urls import path
from proxy.views.games import GameSearchView, GameBulkView, GameDetailView

app_name = 'games'

urlpatterns = [
    path(
        '<int:game_id>',
        GameDetailView.as_view(),
        name='detail'
    ),
    path(
        'search',
        GameSearchView.as_view(),
        name='search'
    ),
    path(
        'bulk',
        GameBulkView.as_view(),
        name='bulk'
    ),
]
