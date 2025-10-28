from rest_framework import status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from dj_rest_auth.views import LogoutView as DjRestAuthLogoutView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import AccessToken

class LogoutView(DjRestAuthLogoutView):
    permission_classes = [IsAuthenticated]

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
