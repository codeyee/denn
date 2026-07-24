from django.urls import path, include
from authentication.views import LogoutAllView, LogoutView, RegisterView

app_name = 'authentication'

urlpatterns = [
    path('', include('dj_rest_auth.urls')),
    path('register/', RegisterView.as_view(), name='register'),
    path('logout/', LogoutView.as_view(), name='rest_logout'),
    path('logout-all/', LogoutAllView.as_view(), name='rest_logout_all'),
]
