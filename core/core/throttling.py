from rest_framework.throttling import (
    AnonRateThrottle,
    SimpleRateThrottle,
    UserRateThrottle,
)

from core.catalog_service import get_trusted_catalog_visitor


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


class CatalogDetailRateThrottle(SimpleRateThrottle):
    """Apply the public detail quota per signed visitor, not per web host."""

    rate = '100/day'

    def allow_request(self, request, view):
        self.rate = (
            '1000/day'
            if request.user and request.user.is_authenticated
            else '100/day'
        )
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request, view)

    def get_cache_key(self, request, view):
        if request.user and request.user.is_authenticated:
            ident = f'user:{request.user.pk}'
        else:
            visitor = get_trusted_catalog_visitor(request)
            ident = (
                f'visitor:{visitor}'
                if visitor
                else f'ip:{self.get_ident(request)}'
            )

        return self.cache_format % {
            'scope': 'catalog-detail',
            'ident': ident,
        }


class CatalogResolveRateThrottle(SimpleRateThrottle):
    """Bound catalog identity writes without applying the anonymous daily cap."""

    rate = '600/minute'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': 'catalog-resolve',
            'ident': catalog_resolve_ident(request),
        }


class CatalogResolveSustainedRateThrottle(SimpleRateThrottle):
    """Preserve the user daily cap while giving the shared web path headroom."""

    rate = '1000/day'

    def allow_request(self, request, view):
        self.rate = (
            '1000/day'
            if request.user and request.user.is_authenticated
            else '100000/day'
        )
        self.num_requests, self.duration = self.parse_rate(self.rate)
        return super().allow_request(request, view)

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': 'catalog-resolve-sustained',
            'ident': catalog_resolve_ident(request),
        }


def catalog_resolve_ident(request):
    if request.user and request.user.is_authenticated:
        return f'user:{request.user.pk}'
    return f'service:{request.headers.get("X-Api-Consumer", "unknown")}'
