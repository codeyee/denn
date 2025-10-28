from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)

urlpatterns = [
    path("api/admin/", admin.site.urls),

    path('api/docs/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),

    path("api/auth/", include('authentication.urls', namespace='authentication')),
    path("api/content/", include('content.urls', namespace='content')),
    path("api/proxy/", include('proxy.urls', namespace='proxy')),
]
