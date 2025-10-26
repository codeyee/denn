from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("api/admin/", admin.site.urls),
    path("api/auth/", include('authentication.urls', namespace='authentication')),
    path("api/content/", include('content.urls', namespace='content')),
    path("api/proxy/", include('proxy.urls', namespace='proxy')),
]
