from rest_framework.throttling import UserRateThrottle, AnonRateThrottle


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