from django.urls import path
from proxy.views.games import GameSearchView, GameBulkView

app_name = 'games'

urlpatterns = [
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
