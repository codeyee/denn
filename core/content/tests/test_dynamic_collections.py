from django.contrib.auth.models import User
from rest_framework import status
from rest_framework.test import APITestCase

from content.models import (
    ContentItem,
    ContentItemBrowseMetadata,
    ListItem,
    UserContentTracking,
    UserList,
)
from content.services.tracking_service import transition_tracking


class DynamicCollectionsApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username="owner", password="password")
        self.other_user = User.objects.create_user(username="other", password="password")
        self.movie = self._content("movie", ContentItem.ContentType.MOVIE)
        self.show = self._content("show", ContentItem.ContentType.TV_SHOW)
        self.season = self._content("season", ContentItem.ContentType.SEASON)
        self.album = self._content("album", ContentItem.ContentType.ALBUM)
        UserContentTracking.objects.create(
            user=self.user,
            content_item=self.movie,
            status=UserContentTracking.Status.BACKLOG,
        )
        UserContentTracking.objects.create(
            user=self.user,
            content_item=self.show,
            status=UserContentTracking.Status.IN_PROGRESS,
        )
        UserContentTracking.objects.create(
            user=self.user,
            content_item=self.season,
            status=UserContentTracking.Status.BACKLOG,
        )
        UserContentTracking.objects.create(
            user=self.user,
            content_item=self.album,
            status=UserContentTracking.Status.COMPLETED,
        )
        UserContentTracking.objects.create(
            user=self.other_user,
            content_item=self._content("other", ContentItem.ContentType.MOVIE),
            status=UserContentTracking.Status.BACKLOG,
        )
        self.client.force_authenticate(self.user)

    def _content(self, external_id, content_type):
        return ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id=external_id,
            content_type=content_type,
        )

    def test_collection_metadata_materializes_system_lists(self):
        response = self.client.get("/api/content/dynamic-collections/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["enabled"])
        collections = {item["key"]: item for item in response.data["collections"]}
        self.assertEqual(collections["backlog"]["item_count"], 2)
        self.assertEqual(collections["series"]["item_count"], 2)
        self.assertEqual(collections["movies"]["item_count"], 1)
        self.assertEqual(
            UserList.objects.filter(
                owner=self.user,
                list_type=UserList.ListType.DYNAMIC,
            ).count(),
            10,
        )
        backlog = UserList.objects.get(
            owner=self.user,
            dynamic_key="backlog",
        )
        self.assertEqual(
            set(backlog.items.values_list("content_item_id", flat=True)),
            {self.movie.id, self.season.id},
        )
        self.assertEqual(collections["backlog"]["list_id"], backlog.id)

    def test_system_lists_use_the_standard_lists_endpoint(self):
        response = self.client.get("/api/content/lists/?items_size=4")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        lists = response.data["results"]
        series = next(item for item in lists if item["dynamic_key"] == "series")
        self.assertEqual(series["list_type"], UserList.ListType.DYNAMIC)
        self.assertEqual(
            {item["content_item"]["id"] for item in series["items"]},
            {self.show.id, self.season.id},
        )

    def test_series_includes_shows_and_seasons_and_is_user_scoped(self):
        response = self.client.get("/api/content/dynamic-collections/series/items/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["metadata"]["count"], 2)
        returned_ids = {item["content"]["id"] for item in response.data["results"]}
        self.assertEqual(returned_ids, {self.show.id, self.season.id})

    def test_disabling_a_collection_hides_its_route_without_deleting_tracking(self):
        update = self.client.patch(
            "/api/content/dynamic-collections/settings/",
            {"collections": [{"key": "movies", "enabled": False}]},
            format="json",
        )

        self.assertEqual(update.status_code, status.HTTP_200_OK)
        response = self.client.get("/api/content/dynamic-collections/movies/items/")
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        movies_list = UserList.objects.get(owner=self.user, dynamic_key="movies")
        list_response = self.client.get(f"/api/content/lists/{movies_list.id}/")
        self.assertEqual(list_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertTrue(UserContentTracking.objects.filter(user=self.user, content_item=self.movie).exists())

    def test_transition_moves_items_between_system_lists(self):
        self.client.get("/api/content/dynamic-collections/")
        transition_tracking(
            user=self.user,
            content_item=self.movie,
            status=UserContentTracking.Status.COMPLETED,
        )

        backlog = UserList.objects.get(owner=self.user, dynamic_key="backlog")
        completed = UserList.objects.get(owner=self.user, dynamic_key="completed")
        self.assertFalse(backlog.items.filter(content_item=self.movie).exists())
        self.assertTrue(completed.items.filter(content_item=self.movie).exists())

    def test_system_list_and_items_cannot_be_manually_changed(self):
        self.client.get("/api/content/dynamic-collections/")
        backlog = UserList.objects.get(owner=self.user, dynamic_key="backlog")
        item = ListItem.objects.get(user_list=backlog, content_item=self.movie)

        self.assertEqual(
            self.client.patch(
                f"/api/content/lists/{backlog.id}/",
                {"name": "Nope"},
                format="json",
            ).status_code,
            status.HTTP_400_BAD_REQUEST,
        )
        self.assertEqual(
            self.client.delete(
                f"/api/content/lists/{backlog.id}/items/{item.id}/",
            ).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_system_list_order_can_be_customized(self):
        self.client.get("/api/content/dynamic-collections/")
        backlog = UserList.objects.get(owner=self.user, dynamic_key="backlog")
        item_ids = list(
            backlog.items.order_by("list_order").values_list("id", flat=True)
        )

        response = self.client.post(
            f"/api/content/lists/{backlog.id}/items/reorder/",
            {"order": list(reversed(item_ids))},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(
            list(backlog.items.order_by("list_order").values_list("id", flat=True)),
            list(reversed(item_ids)),
        )

    def test_system_list_supports_tracking_status_filter_and_grouping(self):
        self.client.get("/api/content/dynamic-collections/")
        series = UserList.objects.get(owner=self.user, dynamic_key="series")

        response = self.client.get(
            f"/api/content/lists/{series.id}/items/",
            {"filter[tracking_status]": "backlog", "group_by": "tracking_status"},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK, response.data)
        self.assertEqual(
            [item["content_item"]["id"] for item in response.data["results"]],
            [self.season.id],
        )
        self.assertEqual(response.data["metadata"]["groups"][0]["key"], "backlog")

    def test_random_type_pick_only_returns_backlog_content(self):
        response = self.client.post("/api/content/dynamic-collections/series/random/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"]["content"]["id"], self.season.id)
        self.assertEqual(response.data["result"]["status"], UserContentTracking.Status.BACKLOG)

    def test_standard_list_random_pick_uses_backlog_for_type_lists(self):
        self.client.get("/api/content/dynamic-collections/")
        series = UserList.objects.get(owner=self.user, dynamic_key="series")
        ContentItemBrowseMetadata.objects.create(
            content_item=self.season,
            display_title="Season one",
        )

        response = self.client.post(f"/api/content/lists/{series.id}/random/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"]["content_item"]["id"], self.season.id)
        self.assertEqual(
            response.data["result"]["content_item"]["source_data"]["title"],
            "Season one",
        )

    def test_personal_list_random_pick_uses_personal_backlog(self):
        personal = UserList.objects.create(
            owner=self.user,
            name="Personal queue",
            list_type=UserList.ListType.PERSONAL,
        )
        ListItem.objects.create(
            user_list=personal,
            content_item=self.movie,
            added_by=self.user,
        )
        response = self.client.post(f"/api/content/lists/{personal.id}/random/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"]["content_item"]["id"], self.movie.id)

    def test_shared_list_random_pick_uses_pending_context(self):
        pending = self._content("shared-pending", ContentItem.ContentType.MOVIE)
        completed = self._content("shared-completed", ContentItem.ContentType.MOVIE)
        shared = UserList.objects.create(
            owner=self.user,
            name="Shared queue",
            list_type=UserList.ListType.SHARED,
        )
        ListItem.objects.create(
            user_list=shared,
            content_item=pending,
            added_by=self.user,
            context_status=ListItem.Status.PENDING,
        )
        ListItem.objects.create(
            user_list=shared,
            content_item=completed,
            added_by=self.user,
            context_status=ListItem.Status.COMPLETED,
        )

        response = self.client.post(f"/api/content/lists/{shared.id}/random/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["result"]["content_item"]["id"], pending.id)

    def test_list_random_pick_can_exclude_previous_result(self):
        personal = UserList.objects.create(
            owner=self.user,
            name="One-shot queue",
            list_type=UserList.ListType.PERSONAL,
        )
        ListItem.objects.create(
            user_list=personal,
            content_item=self.movie,
            added_by=self.user,
        )

        response = self.client.post(f"/api/content/lists/{personal.id}/random/")
        excluded = response.data["result"]["content_item"]["id"]
        repeat = self.client.post(
            f"/api/content/lists/{personal.id}/random/",
            {"exclude_content_ids": [excluded]},
            format="json",
        )

        self.assertEqual(repeat.status_code, status.HTTP_200_OK)
        self.assertIsNone(repeat.data["result"])

    def test_random_returns_empty_result_when_no_planned_content_exists(self):
        response = self.client.post("/api/content/dynamic-collections/albums/random/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["result"])
