from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("proxy/", include('proxy.urls', namespace='proxy')),
]
