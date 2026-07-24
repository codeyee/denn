from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken
from rest_framework_simplejwt.tokens import RefreshToken


class AuthCookieTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='cookie-user',
            email='cookie@example.com',
            password='Cookie-password-123',
        )

    def test_login_returns_identity_and_secure_httponly_cookies(self):
        response = self.client.post(
            '/api/auth/login/',
            {
                'email': self.user.email,
                'password': 'Cookie-password-123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.data), {'user'})
        self.assert_secure_cookie(response, 'auth-token')
        self.assert_secure_cookie(response, 'refresh-token')

    def test_registration_does_not_return_tokens_in_json(self):
        response = self.client.post(
            '/api/auth/register/',
            {
                'username': 'registered-user',
                'email': 'registered@example.com',
                'password': 'Registration-password-123',
                'password_confirm': 'Registration-password-123',
            },
            format='json',
        )

        self.assertEqual(response.status_code, 201)
        self.assertEqual(set(response.data), {'user'})
        self.assert_secure_cookie(response, 'auth-token')
        self.assert_secure_cookie(response, 'refresh-token')

    def test_refresh_rotates_and_blacklists_the_previous_credential(self):
        original_token = RefreshToken.for_user(self.user)
        original_jti = original_token['jti']
        original = str(original_token)

        response = self.client.post(
            '/api/auth/token/refresh/',
            {'refresh': original},
            format='json',
        )

        self.assertEqual(response.status_code, 200)
        rotated = response.cookies['refresh-token'].value
        self.assertNotEqual(rotated, original)
        self.assertNotIn('refresh', response.data)
        self.assertTrue(
            BlacklistedToken.objects.filter(
                token__jti=original_jti,
            ).exists(),
        )

        reused = self.client.post(
            '/api/auth/token/refresh/',
            {'refresh': original},
            format='json',
        )
        self.assertEqual(reused.status_code, 401)

    def assert_secure_cookie(self, response, name):
        cookie = response.cookies[name]
        self.assertTrue(cookie['httponly'])
        self.assertTrue(cookie['secure'])
        self.assertEqual(cookie['samesite'], 'Lax')
        self.assertEqual(cookie['path'], '/')
