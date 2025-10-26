from django.urls import path, include
from rest_framework.routers import DefaultRouter

from content.views import RatingViewSet

app_name = 'ratings'

router = DefaultRouter()
router.register(r'', RatingViewSet, basename='rating')

urlpatterns = [
    path('', include(router.urls)),
]
