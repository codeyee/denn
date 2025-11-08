from django.urls import path
from proxy.views.book import BookSearchView, BookBulkView

app_name = 'book'

urlpatterns = [
    path('search', BookSearchView.as_view(), name='search'),
    path('bulk', BookBulkView.as_view(), name='books-bulk'),
]
