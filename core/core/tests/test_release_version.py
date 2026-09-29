from unittest import mock

from django.test import SimpleTestCase

SHA = "0123456789abcdef0123456789abcdef01234567"


class ReleaseVersionTests(SimpleTestCase):
    def test_returns_build_sha_without_authentication(self):
        with mock.patch.dict("os.environ", {"BUILD_SHA": SHA}):
            response = self.client.get("/api/version/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"service": "core", "sha": SHA})
        self.assertIn("no-store", response["Cache-Control"])

    def test_returns_null_sha_when_build_sha_is_missing_or_invalid(self):
        for env in ({}, {"BUILD_SHA": ""}, {"BUILD_SHA": "not-a-sha"}):
            with self.subTest(env=env):
                with mock.patch.dict("os.environ", env, clear=True):
                    response = self.client.get("/api/version/")

                self.assertEqual(response.json(), {"service": "core", "sha": None})

    def test_rejects_non_get_methods(self):
        response = self.client.post("/api/version/")

        self.assertEqual(response.status_code, 405)
