from django.contrib.auth.models import User
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from content.models import ContentItem, Rating


class PublicRatingReadTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="reviewer",
            email="private@example.com",
            first_name="Private",
            last_name="Person",
        )
        self.item = ContentItem.objects.create(
            source_api=ContentItem.SourceAPI.TMDB,
            external_id="550",
            content_type=ContentItem.ContentType.MOVIE,
        )
        self.rating = Rating.objects.create(
            user=self.user,
            content_item=self.item,
            score="8.5",
            comment="Public review",
        )
        self.list_url = reverse("content:ratings:rating-list")

    def test_anonymous_list_exposes_active_review_without_private_identity(self):
        response = self.client.get(
            self.list_url,
            {"content_item_id": self.item.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        rating = response.data["results"][0]
        self.assertEqual(rating["id"], self.rating.id)
        self.assertEqual(rating["comment"], "Public review")
        self.assertEqual(
            rating["user"],
            {"id": self.user.id, "username": "reviewer"},
        )

    def test_anonymous_cannot_create_rating(self):
        response = self.client.post(
            self.list_url,
            {
                "source_api": ContentItem.SourceAPI.TMDB,
                "external_id": "551",
                "content_type": ContentItem.ContentType.MOVIE,
                "score": "9.0",
            },
        )

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_anonymous_list_requires_a_content_scope(self):
        response = self.client.get(self.list_url)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
