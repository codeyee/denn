import json
from unittest.mock import patch

from django.contrib.auth.models import User
from django.core.serializers.json import DjangoJSONEncoder
from django.db import connection
from django.test.utils import CaptureQueriesContext
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework.serializers import ValidationError

from authentication.serializers import RegisterSerializer
from content.models import (
    Author,
    ContentItem,
    ContentItemAuthor,
    ContentItemBrowseMetadata,
    GameDetail,
    Image,
    ListItem,
    MovieDetail,
    Rating,
    SeasonDetail,
    UserContentTracking,
    UserList,
)


class PublicProfileApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="public-user",
            email="private@example.com",
            password="secret",
        )
        self.user.public_profile.bio = "Movies, games, and books."
        self.user.public_profile.avatar_url = "https://images.example/avatar.jpg"
        self.user.public_profile.save()
        self.movie = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="550",
            content_type=ContentItem.ContentType.MOVIE,
        )
        ContentItemBrowseMetadata.objects.create(
            content_item=self.movie,
            display_title="Fight Club",
            release_date="1999-10-15",
        )
        MovieDetail.objects.create(
            content_item=self.movie,
            title="Fight Club",
            image_url="https://images.example/fight-club.jpg",
            release_date="1999-10-15",
        )
        director = Author.objects.create(name="David Fincher")
        ContentItemAuthor.objects.create(
            content_item=self.movie,
            author=director,
            role="director",
            position=0,
        )
        self.movie_gallery = Image.objects.create(
            content_item=self.movie,
            type=Image.Type.GALLERY,
            size=Image.Size.ORIGINAL,
            image_url="https://images.example/fight-club-backdrop.jpg",
        )
        UserContentTracking.objects.create(
            user=self.user,
            content_item=self.movie,
            status=UserContentTracking.Status.COMPLETED,
            last_completed_at=self.user.date_joined,
            is_favorite=True,
            favorited_at=self.user.date_joined,
        )
        Rating.objects.create(
            user=self.user,
            content_item=self.movie,
            score="9.0",
            comment="A sharp review",
            is_active=True,
        )
        self.public_list = UserList.objects.create(
            owner=self.user,
            name="Public picks",
            visibility=UserList.Visibility.PUBLIC,
        )
        self.private_list = UserList.objects.create(
            owner=self.user,
            name="Private picks",
            visibility=UserList.Visibility.PRIVATE,
        )

    def test_overview_is_anonymous_pii_safe_and_within_query_budget(self):
        url = reverse("profiles:overview", kwargs={"username": self.user.username})
        with patch(
            "content.services.source_data_orchestrator._proxy_fetch"
        ) as proxy_fetch:
            with CaptureQueriesContext(connection) as queries:
                response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(queries), 10)
        proxy_fetch.assert_not_called()
        payload = json.dumps(response.data, cls=DjangoJSONEncoder)
        self.assertNotIn(self.user.email, payload)
        self.assertEqual(response.data["profile"]["username"], self.user.username)
        self.assertEqual(response.data["counters"]["completed"], 1)
        self.assertEqual(response.data["counters"]["public_lists"], 1)
        self.assertEqual(
            response.data["favorites"]["MOVIE"][0]["content"]["title"],
            "Fight Club",
        )
        movie = response.data["favorites"]["MOVIE"][0]["content"]
        self.assertEqual(
            movie["authors"],
            [{"name": "David Fincher", "type": "director"}],
        )
        self.assertEqual(
            movie["backdrop"],
            "https://images.example/fight-club-backdrop.jpg",
        )
        self.assertEqual(
            response.data["banner_media"][0]["image_url"],
            "https://images.example/fight-club-backdrop.jpg",
        )
        self.assertEqual(response.data["banner_media"][0]["treatment"], "cover")

    def test_poster_only_favorite_gets_a_contained_banner_media(self):
        album = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.SPOTIFY,
            external_id="album-1",
            content_type=ContentItem.ContentType.ALBUM,
        )
        ContentItemBrowseMetadata.objects.create(
            content_item=album,
            display_title="Night Signals",
            artist="First Artist, Second Artist, Third Artist",
        )
        Image.objects.create(
            content_item=album,
            type=Image.Type.POSTER,
            size=Image.Size.ORIGINAL,
            image_url="https://images.example/night-signals.jpg",
        )
        UserContentTracking.objects.create(
            user=self.user,
            content_item=album,
            status=UserContentTracking.Status.COMPLETED,
            last_completed_at=self.user.date_joined,
            is_favorite=True,
            favorited_at=self.user.date_joined,
        )

        response = self.client.get(
            reverse(
                "profiles:overview",
                kwargs={"username": self.user.username},
            )
        )

        self.assertEqual(response.status_code, 200)
        album_banner = next(
            media
            for media in response.data["banner_media"]
            if media["content_id"] == album.id
        )
        self.assertEqual(
            album_banner["image_url"],
            "https://images.example/night-signals.jpg",
        )
        self.assertEqual(
            album_banner["treatment"],
            "contained-poster",
        )
        album_option = next(
            option
            for option in response.data["banner_options"]
            if option["content_id"] == album.id and option["image_id"] is None
        )
        self.assertEqual(
            album_option["authors"],
            ["First Artist", "Second Artist"],
        )

    def test_banner_options_include_first_two_authors(self):
        second_director = Author.objects.create(name="Second Director")
        ContentItemAuthor.objects.create(
            content_item=self.movie,
            author=second_director,
            role="director",
            position=1,
        )

        response = self.client.get(
            reverse(
                "profiles:overview",
                kwargs={"username": self.user.username},
            )
        )

        movie_option = next(
            option
            for option in response.data["banner_options"]
            if option["content_id"] == self.movie.id and option["image_id"] is None
        )
        self.assertEqual(
            movie_option["authors"],
            ["David Fincher", "Second Director"],
        )

    def test_owner_can_choose_favorite_and_specific_banner_image(self):
        self.client.force_authenticate(self.user)
        update = self.client.patch(
            reverse("profiles:me"),
            {
                "banner_content_id": self.movie.id,
                "banner_image_id": self.movie_gallery.id,
            },
            format="json",
        )

        self.assertEqual(update.status_code, 200)
        self.assertEqual(update.data["banner_content_id"], self.movie.id)
        self.assertEqual(update.data["banner_image_id"], self.movie_gallery.id)

        overview = self.client.get(
            reverse(
                "profiles:overview",
                kwargs={"username": self.user.username},
            )
        )

        self.assertEqual(overview.status_code, 200)
        self.assertEqual(
            overview.data["selected_banner"]["image_id"],
            self.movie_gallery.id,
        )
        self.assertTrue(
            any(
                option["image_id"] is None
                and option["content_id"] == self.movie.id
                for option in overview.data["banner_options"]
            )
        )
        self.assertTrue(
            any(
                option["image_id"] == self.movie_gallery.id
                for option in overview.data["banner_options"]
            )
        )

    def test_banner_selection_requires_an_active_favorite(self):
        other_movie = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="other-movie",
            content_type=ContentItem.ContentType.MOVIE,
        )
        self.client.force_authenticate(self.user)

        response = self.client.patch(
            reverse("profiles:me"),
            {"banner_content_id": other_movie.id},
            format="json",
        )

        self.assertEqual(response.status_code, 400)
        self.assertIn("banner_content_id", response.data["fields"])

    def test_clearing_a_favorite_clears_its_banner_selection(self):
        self.client.force_authenticate(self.user)
        self.client.patch(
            reverse("profiles:me"),
            {
                "banner_content_id": self.movie.id,
                "banner_image_id": self.movie_gallery.id,
            },
            format="json",
        )

        clear_favorite = self.client.patch(
            reverse(
                "content:content-tracking-favorite",
                kwargs={"content_id": self.movie.id},
            ),
            {"is_favorite": False},
            format="json",
        )

        self.assertEqual(clear_favorite.status_code, 200)
        self.user.public_profile.refresh_from_db()
        self.assertIsNone(self.user.public_profile.banner_content_item_id)
        self.assertIsNone(self.user.public_profile.banner_image_id)

        overview = self.client.get(
            reverse(
                "profiles:overview",
                kwargs={"username": self.user.username},
            )
        )
        self.assertIsNone(overview.data["selected_banner"])

    def test_game_favorites_include_developer_attribution(self):
        game = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.IGDB,
            external_id="1942",
            content_type=ContentItem.ContentType.GAME,
        )
        ContentItemBrowseMetadata.objects.create(
            content_item=game,
            display_title="The Witcher 3",
        )
        GameDetail.objects.create(
            content_item=game,
            title="The Witcher 3",
            image_url="https://images.example/witcher-cover.jpg",
        )
        developer = Author.objects.create(name="CD Projekt Red")
        ContentItemAuthor.objects.create(
            content_item=game,
            author=developer,
            role="developer",
            position=0,
        )
        UserContentTracking.objects.create(
            user=self.user,
            content_item=game,
            status=UserContentTracking.Status.COMPLETED,
            last_completed_at=self.user.date_joined,
            is_favorite=True,
            favorited_at=self.user.date_joined,
        )

        response = self.client.get(
            reverse(
                "profiles:overview",
                kwargs={"username": self.user.username},
            )
        )

        self.assertEqual(response.status_code, 200)
        game_content = response.data["favorites"]["GAME"][0]["content"]
        self.assertEqual(
            game_content["authors"],
            [{"name": "CD Projekt Red", "type": "developer"}],
        )

    def test_progress_endpoint_composes_tracking_rating_once(self):
        url = reverse(
            "profiles:progress",
            kwargs={"username": self.user.username},
        )
        with CaptureQueriesContext(connection) as queries:
            response = self.client.get(
                url,
                {
                    "status": UserContentTracking.Status.COMPLETED,
                    "rated": "true",
                    "reviewed": "true",
                    "favorite": "true",
                },
            )

        self.assertEqual(response.status_code, 200)
        self.assertLessEqual(len(queries), 10)
        self.assertEqual(response.data["metadata"]["count"], 1)
        progress = response.data["results"][0]
        self.assertEqual(progress["content"]["id"], self.movie.id)
        self.assertEqual(progress["status"], "completed")
        self.assertTrue(progress["is_favorite"])
        self.assertEqual(float(progress["rating"]["score"]), 9.0)
        self.assertEqual(progress["rating"]["review"], "A sharp review")

    def test_progress_combines_multi_value_filters_and_sort_direction(self):
        game = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.IGDB,
            external_id="1942",
            content_type=ContentItem.ContentType.GAME,
        )
        ContentItemBrowseMetadata.objects.create(
            content_item=game,
            display_title="Alpha Game",
        )
        GameDetail.objects.create(
            content_item=game,
            title="Alpha Game",
        )
        UserContentTracking.objects.create(
            user=self.user,
            content_item=game,
            status=UserContentTracking.Status.IN_PROGRESS,
        )
        url = reverse(
            "profiles:progress",
            kwargs={"username": self.user.username},
        )
        filters = {
            "type": "MOVIE,GAME",
            "status": "completed,in_progress",
            "sort": "title",
        }

        ascending = self.client.get(url, {**filters, "order": "asc"})
        descending = self.client.get(url, {**filters, "order": "desc"})

        self.assertEqual(
            [row["content"]["id"] for row in ascending.data["results"]],
            [game.id, self.movie.id],
        )
        self.assertEqual(
            [row["content"]["id"] for row in descending.data["results"]],
            [self.movie.id, game.id],
        )

    def test_progress_tv_filter_can_split_series_and_seasons(self):
        tv_show = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="1396",
            content_type=ContentItem.ContentType.TV_SHOW,
        )
        season = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="1396:1",
            content_type=ContentItem.ContentType.SEASON,
        )
        ContentItemBrowseMetadata.objects.create(
            content_item=tv_show,
            display_title="Breaking Bad",
        )
        ContentItemBrowseMetadata.objects.create(
            content_item=season,
            display_title="Breaking Bad — Season 1",
        )
        SeasonDetail.objects.create(
            content_item=season,
            tv_show=tv_show,
            season_number=1,
            tv_show_name="Breaking Bad",
            title="Season 1",
        )
        for item in (tv_show, season):
            UserContentTracking.objects.create(
                user=self.user,
                content_item=item,
                status=UserContentTracking.Status.IN_PROGRESS,
            )

        url = reverse(
            "profiles:progress",
            kwargs={"username": self.user.username},
        )
        combined = self.client.get(url, {"type": "TV_SHOW", "tvKind": "all"})
        seasons = self.client.get(
            url,
            {"type": "TV_SHOW", "tvKind": "seasons"},
        )

        self.assertEqual(
            {row["content"]["id"] for row in combined.data["results"]},
            {tv_show.id, season.id},
        )
        self.assertEqual(
            [row["content"]["id"] for row in seasons.data["results"]],
            [season.id],
        )
        self.assertEqual(
            seasons.data["results"][0]["content"]["title"],
            "Breaking Bad: Season 1",
        )
        self.assertEqual(
            seasons.data["results"][0]["content"]["season_number"],
            1,
        )

    def test_public_lists_endpoint_excludes_private_lists_and_email(self):
        url = reverse("profiles:lists", kwargs={"username": self.user.username})
        response = self.client.get(url)

        self.assertEqual(response.status_code, 200)
        self.assertEqual([row["id"] for row in response.data["results"]], [
            self.public_list.id,
        ])
        self.assertNotIn(
            self.user.email,
            json.dumps(response.data, cls=DjangoJSONEncoder),
        )

    def test_public_profile_pages_are_local_and_within_query_budget(self):
        endpoint_names = [
            "profiles:progress",
            "profiles:completed",
            "profiles:ratings",
            "profiles:lists",
        ]
        with patch(
            "content.services.source_data_orchestrator._proxy_fetch"
        ) as proxy_fetch:
            for endpoint_name in endpoint_names:
                with self.subTest(endpoint=endpoint_name):
                    url = reverse(
                        endpoint_name,
                        kwargs={"username": self.user.username},
                    )
                    with CaptureQueriesContext(connection) as queries:
                        response = self.client.get(url)
                    self.assertEqual(response.status_code, 200)
                    self.assertLessEqual(len(queries), 10)
        proxy_fetch.assert_not_called()

    def test_inactive_rating_is_excluded_from_profile_pages_and_counts(self):
        Rating.objects.filter(user=self.user).update(is_active=False)
        overview = self.client.get(
            reverse(
                "profiles:overview",
                kwargs={"username": self.user.username},
            )
        )
        ratings = self.client.get(
            reverse(
                "profiles:ratings",
                kwargs={"username": self.user.username},
            )
        )
        self.assertEqual(overview.data["counters"]["ratings"], 0)
        self.assertEqual(overview.data["counters"]["reviews"], 0)
        self.assertEqual(ratings.data["results"], [])

    def test_rating_score_filters_reject_invalid_values(self):
        url = reverse(
            "profiles:ratings",
            kwargs={"username": self.user.username},
        )

        for params in (
            {"minScore": "not-a-number"},
            {"maxScore": "10.5"},
            {"minScore": "9.0", "maxScore": "8.0"},
        ):
            with self.subTest(params=params):
                response = self.client.get(url, params)
                self.assertEqual(response.status_code, 400)

    def test_public_profile_edit_validates_https_and_bio_length(self):
        self.client.force_authenticate(self.user)
        invalid_url = self.client.patch(
            reverse("profiles:me"),
            {"avatar_url": "http://images.example/avatar.jpg"},
            format="json",
        )
        self.assertEqual(invalid_url.status_code, 400)

        invalid_bio = self.client.patch(
            reverse("profiles:me"),
            {"bio": "x" * 281},
            format="json",
        )
        self.assertEqual(invalid_bio.status_code, 400)

        valid = self.client.patch(
            reverse("profiles:me"),
            {
                "bio": "A concise public bio.",
                "avatar_url": "https://images.example/new-avatar.jpg",
            },
            format="json",
        )
        self.assertEqual(valid.status_code, 200)
        self.assertEqual(valid.data["username"], self.user.username)

    def test_private_list_returns_404_while_public_list_is_anonymous(self):
        private_response = self.client.get(
            reverse("content:lists:list-detail", kwargs={"pk": self.private_list.id})
        )
        self.assertEqual(private_response.status_code, 404)

        public_response = self.client.get(
            reverse("content:lists:list-detail", kwargs={"pk": self.public_list.id})
        )
        self.assertEqual(public_response.status_code, 200)
        self.assertNotIn(
            self.user.email,
            json.dumps(public_response.data, cls=DjangoJSONEncoder),
        )

    def test_public_list_owner_keeps_private_management_shape(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(
            reverse("content:lists:list-detail", kwargs={"pk": self.public_list.id})
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("members", response.data)
        self.assertIn("email", response.data["owner"])

    def test_only_owner_can_change_public_list_visibility(self):
        member = User.objects.create_user(username="member", password="secret")
        self.public_list.members.add(member)
        self.client.force_authenticate(member)
        response = self.client.patch(
            reverse("content:lists:list-detail", kwargs={"pk": self.public_list.id}),
            {"visibility": UserList.Visibility.PRIVATE},
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_public_collaboration_is_returned_with_member_role(self):
        owner = User.objects.create_user(username="other-owner", password="secret")
        collaboration = UserList.objects.create(
            owner=owner,
            name="Collaborative picks",
            list_type=UserList.ListType.SHARED,
            visibility=UserList.Visibility.PUBLIC,
        )
        collaboration.members.add(self.user)
        response = self.client.get(
            reverse("profiles:lists", kwargs={"username": self.user.username})
        )
        roles = {row["id"]: row["role"] for row in response.data["results"]}
        self.assertEqual(roles[collaboration.id], "member")

    def test_authenticated_list_payload_includes_personal_tracking(self):
        ListItem.objects.create(
            user_list=self.public_list,
            content_item=self.movie,
            added_by=self.user,
        )
        self.client.force_authenticate(self.user)
        response = self.client.get(
            reverse("content:lists:list-detail", kwargs={"pk": self.public_list.id})
        )
        self.assertEqual(response.status_code, 200)
        tracking = response.data["items"][0]["content_item"][
            "current_user_tracking"
        ]
        self.assertEqual(tracking["status"], UserContentTracking.Status.COMPLETED)

    def test_season_list_item_uses_independent_season_tracking(self):
        tv_show = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="1396",
            content_type=ContentItem.ContentType.TV_SHOW,
        )
        season = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="1396:1",
            content_type=ContentItem.ContentType.SEASON,
        )
        SeasonDetail.objects.create(
            content_item=season,
            tv_show=tv_show,
            season_number=1,
        )
        UserContentTracking.objects.create(
            user=self.user,
            content_item=season,
            status=UserContentTracking.Status.IN_PROGRESS,
        )
        ListItem.objects.create(
            user_list=self.public_list,
            content_item=season,
            added_by=self.user,
        )

        self.client.force_authenticate(self.user)
        response = self.client.get(
            reverse(
                "content:lists:items-list",
                kwargs={"list_pk": self.public_list.id},
            )
        )

        self.assertEqual(response.status_code, 200)
        tracking = response.data["results"][0]["content_item"][
            "current_user_tracking"
        ]
        self.assertEqual(tracking["content_id"], season.id)
        self.assertEqual(
            tracking["status"],
            UserContentTracking.Status.IN_PROGRESS,
        )

    def test_content_detail_is_anonymous_and_never_exposes_user_state(self):
        with patch(
            "content.services.source_data_orchestrator._proxy_fetch"
        ) as proxy_fetch:
            response = self.client.get(
                reverse("content:content-detail-by-id", kwargs={"id": self.movie.id})
            )
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["current_user_rating"])
        self.assertIsNone(response.data["current_user_tracking"])
        proxy_fetch.assert_not_called()

    def test_auth_user_payload_is_slim_and_username_is_immutable(self):
        self.client.force_authenticate(self.user)
        response = self.client.patch(
            "/api/auth/user/",
            {"username": "renamed", "first_name": "Public"},
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.user.refresh_from_db()
        self.assertEqual(self.user.username, "public-user")
        self.assertNotIn("lists", response.data)
        self.assertNotIn("ratings", response.data)


class PublicUsernameValidationTests(APITestCase):
    def test_new_usernames_are_lowercase_and_case_insensitive_unique(self):
        serializer = RegisterSerializer()
        self.assertEqual(serializer.validate_username("  New.User_1  "), "new.user_1")

        User.objects.create_user(username="LegacyName", password="secret")
        with self.assertRaises(ValidationError):
            serializer.validate_username("legacyname")

        with self.assertRaises(ValidationError):
            serializer.validate_username("spaces are not allowed")
