from django.urls import path

from authentication.views import (
    CurrentUserPublicProfileView,
    PublicProfileCompletedView,
    PublicProfileListsView,
    PublicProfileOverviewView,
    PublicProfileRatingsView,
)


app_name = "profiles"

urlpatterns = [
    path("me/", CurrentUserPublicProfileView.as_view(), name="me"),
    path(
        "<str:username>/completed/",
        PublicProfileCompletedView.as_view(),
        name="completed",
    ),
    path(
        "<str:username>/ratings/",
        PublicProfileRatingsView.as_view(),
        name="ratings",
    ),
    path(
        "<str:username>/lists/",
        PublicProfileListsView.as_view(),
        name="lists",
    ),
    path(
        "<str:username>/",
        PublicProfileOverviewView.as_view(),
        name="overview",
    ),
]
