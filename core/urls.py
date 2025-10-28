from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView
)

def healthcheck(request):
    return JsonResponse({
        "status": "healthy",
        "service": "Denn API",
        "version": "1.0.0"
    })

urlpatterns = [
    # Healthcheck
    path("", healthcheck, name="healthcheck"),

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
