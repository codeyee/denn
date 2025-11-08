from django.urls import path
from proxy.views.books import BookSearchView, BookBulkView

app_name = 'books'

urlpatterns = [
    path('search', BookSearchView.as_view(), name='search'),
    path('bulk', BookBulkView.as_view(), name='bulk'),
]
