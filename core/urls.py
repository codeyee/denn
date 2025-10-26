from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("auth/", include('authentication.urls', namespace='authentication')),
    path("api/", include('content.urls', namespace='content')),
    path("proxy/", include('proxy.urls', namespace='proxy')),
]
