from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import (
    BlacklistedToken,
    OutstandingToken,
)
from rest_framework_simplejwt.tokens import RefreshToken


class LogoutAllTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(
            username='multi-session-user',
            email='multi-session@example.com',
            password='test-password',
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def test_logout_all_blacklists_every_outstanding_refresh_token(self):
        RefreshToken.for_user(self.user)
        RefreshToken.for_user(self.user)

        response = self.client.post('/api/auth/logout-all/', {}, format='json')

        self.assertEqual(response.status_code, 200)
        outstanding = OutstandingToken.objects.filter(user=self.user)
        self.assertEqual(outstanding.count(), 2)
        self.assertEqual(
            BlacklistedToken.objects.filter(token__in=outstanding).count(),
            2,
        )
