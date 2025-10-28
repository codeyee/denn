from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from core.healthcheck import healthcheck
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)

urlpatterns = [
    # Healthcheck
    path("api/", healthcheck, name="healthcheck"),

    # Admin
    path("api/admin/", admin.site.urls),

    # Documentation
    path('api/docs/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    path('api/swagger/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),

    # API Endpoints
    path("api/auth/", include('authentication.urls', namespace='authentication')),
    path("api/content/", include('content.urls', namespace='content')),
    path("api/proxy/", include('proxy.urls', namespace='proxy')),
]
