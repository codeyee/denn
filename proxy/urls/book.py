from django.urls import path
from proxy.views.book import BookSearchView

app_name = 'book'

urlpatterns = [
    path('search', BookSearchView.as_view(), name='search'),
]
