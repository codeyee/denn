from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from dj_rest_auth.views import LogoutView as DjRestAuthLogoutView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken
from drf_spectacular.utils import extend_schema, OpenApiExample
from core.throttling import AuthRateThrottle

@extend_schema(
    tags=['Authentication'],
    summary='Logout user',
    description='''
    Logout the current user and blacklist their tokens.

    This will invalidate both the access and refresh tokens,
    requiring the user to log in again to access protected endpoints.
    ''',
    request={
        'type': 'object',
        'properties': {
            'refresh': {
                'type': 'string',
                'description': 'Refresh token to blacklist'
            }
        }
    },
    responses={
        200: OpenApiExample(
            'Logout Success',
            value={'detail': 'Successfully logged out.'}
        ),
        400: OpenApiExample(
            'Bad Request',
            value={'detail': 'Invalid token.'}
        ),
        401: OpenApiExample(
            'Unauthorized',
            value={'detail': 'Authentication credentials were not provided.'}
        )
    },
    examples=[
        OpenApiExample(
            'Logout Request',
            value={
                'refresh': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'
            },
            request_only=True
        )
    ]
)
class LogoutView(DjRestAuthLogoutView):
    permission_classes = [IsAuthenticated]
    throttle_classes = [AuthRateThrottle]  # Rate limit: 5 requests/minute

    def post(self, request, *args, **kwargs):
        refresh_token = request.data.get('refresh')

        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass

        auth_header = request.META.get('HTTP_AUTHORIZATION', '')

        if auth_header.startswith('Bearer '):
            access_token = auth_header.split(' ')[1]
            try:
                token = AccessToken(access_token)
                jti = token.get('jti')

                outstanding_token = OutstandingToken.objects.filter(jti=jti).first()
                if outstanding_token: BlacklistedToken.objects.get_or_create(token=outstanding_token)
            except (TokenError, Exception):
                pass

        return super().post(request, *args, **kwargs)
