from rest_framework.throttling import AnonRateThrottle, SimpleRateThrottle, UserRateThrottle


class AuthRateThrottle(AnonRateThrottle):
    scope = 'auth'


class PasswordResetRateThrottle(AnonRateThrottle):
    scope = 'password_reset'


class BulkOperationThrottle(UserRateThrottle):
    scope = 'bulk'


class SustainedRateThrottle(UserRateThrottle):
    scope = 'user'


class BurstRateThrottle(UserRateThrottle):
    rate = '60/minute'


class PublicProfileRateThrottle(SimpleRateThrottle):
    scope = "public_profile"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }
