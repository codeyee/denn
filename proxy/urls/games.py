from django.urls import path
from proxy.views.games import GamesSearchView

app_name = 'games'

urlpatterns = [
    path(
        'search',
        GamesSearchView.as_view(),
        name='search'
    ),
]
