from django.urls import path
from proxy.views.books import BookSearchView, BookBulkView, BookDetailView

app_name = 'books'

urlpatterns = [
    path(
        'search',
        BookSearchView.as_view(),
        name='search'
    ),
    path(
        'bulk',
        BookBulkView.as_view(),
        name='bulk'
    ),
    path(
        '<str:book_id>',
        BookDetailView.as_view(),
        name='detail'
    ),
]
