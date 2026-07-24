from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from authentication.models import UserPreferences
from authentication.serializers import UserSerializer


class UserAdultContentPreferenceTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username="policy-user",
            email="policy@example.com",
            password="test-password",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_new_account_defaults_to_safe_policy(self):
        response = self.client.get("/api/auth/user/")

        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["allow_adult_content"])
        self.assertFalse(
            UserPreferences.objects.filter(user=self.user).exists(),
        )
        self.assertFalse(
            UserSerializer(self.user).data["allow_adult_content"],
        )

    def test_profile_patch_persists_explicit_opt_in_and_opt_out(self):
        opt_in = self.client.patch(
            "/api/auth/user/",
            {"allow_adult_content": True},
            format="json",
        )

        self.assertEqual(opt_in.status_code, 200)
        self.assertTrue(opt_in.data["allow_adult_content"])
        preferences = UserPreferences.objects.get(user=self.user)
        self.assertTrue(preferences.allow_adult_content)

        opt_out = self.client.patch(
            "/api/auth/user/",
            {"allow_adult_content": False},
            format="json",
        )

        self.assertEqual(opt_out.status_code, 200)
        self.assertFalse(opt_out.data["allow_adult_content"])
        preferences.refresh_from_db()
        self.assertFalse(preferences.allow_adult_content)
