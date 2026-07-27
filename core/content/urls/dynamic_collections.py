from django.urls import path

from content.views import (
    DynamicCollectionItemsView,
    DynamicCollectionListView,
    DynamicCollectionRandomView,
    DynamicCollectionSettingsView,
)


urlpatterns = [
    path("", DynamicCollectionListView.as_view(), name="dynamic-collection-list"),
    path(
        "settings/",
        DynamicCollectionSettingsView.as_view(),
        name="dynamic-collection-settings",
    ),
    path(
        "<str:key>/items/",
        DynamicCollectionItemsView.as_view(),
        name="dynamic-collection-items",
    ),
    path(
        "<str:key>/random/",
        DynamicCollectionRandomView.as_view(),
        name="dynamic-collection-random",
    ),
]
