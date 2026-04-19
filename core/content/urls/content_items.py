from django.urls import path, include
from rest_framework.routers import DefaultRouter
from content.views import ContentItemViewSet

app_name = 'content_items'

router = DefaultRouter()
router.register(r'', ContentItemViewSet, basename='content-item')

urlpatterns = [
    path('', include(router.urls)),
]
