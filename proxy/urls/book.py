from django.urls import path
from proxy.views.book import BookSearchView, BookBulkView, BooksSuggestionsView

app_name = 'book'

urlpatterns = [
    path('search', BookSearchView.as_view(), name='search'),
    path('suggestions', BooksSuggestionsView.as_view(), name='suggestions'),
    path('bulk', BookBulkView.as_view(), name='books-bulk'),
]
