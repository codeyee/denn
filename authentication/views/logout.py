from rest_framework import status, serializers
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from dj_rest_auth.views import LogoutView as DjRestAuthLogoutView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken
from drf_spectacular.utils import extend_schema, OpenApiExample, inline_serializer

class LogoutView(DjRestAuthLogoutView):
    permission_classes = [IsAuthenticated]

    @extend_schema(
        tags=['Authentication'],
        summary='Logout user',
        description='''
        Logout the currently authenticated user by blacklisting their JWT tokens.

        You can optionally provide the refresh token in the request body to blacklist it.
        The access token from the Authorization header will also be blacklisted.

        After logout, both tokens will be invalid and cannot be used for authentication.
        ''',
        request=inline_serializer(
            name='LogoutRequest',
            fields={
                'refresh': serializers.CharField(required=False, help_text='Optional refresh token to blacklist')
            }
        ),
        responses={
            200: OpenApiExample(
                'Successful Logout',
                value={'detail': 'Successfully logged out.'},
                response_only=True
            ),
            401: OpenApiExample(
                'Unauthorized',
                value={'detail': 'Authentication credentials were not provided.'},
                response_only=True
            )
        },
        examples=[
            OpenApiExample(
                'Logout with Refresh Token',
                value={'refresh': 'eyJ0eXAiOiJKV1QiLCJhbGc...'},
                request_only=True
            ),
            OpenApiExample(
                'Logout without Refresh Token',
                value={},
                request_only=True
            )
        ]
    )
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
