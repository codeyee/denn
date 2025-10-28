from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiExample
from authentication.serializers import RegisterSerializer, UserSerializer

class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

    @extend_schema(
        tags=['Authentication'],
        summary='Register new user',
        description='''
        Register a new user account with username, email, and password.

        Upon successful registration, returns:
        - User details (id, username, email, first_name, last_name)
        - Access token (JWT) for immediate authentication
        - Refresh token (JWT) to obtain new access tokens

        The access token expires after 5 hours, and the refresh token expires after 7 days.
        ''',
        request=RegisterSerializer,
        responses={
            201: OpenApiExample(
                'Successful Registration',
                value={
                    'user': {
                        'id': 1,
                        'username': 'john',
                        'email': 'john@example.com',
                        'first_name': 'John',
                        'last_name': 'Doe'
                    },
                    'access': 'eyJ0eXAiOiJKV1QiLCJhbGc...',
                    'refresh': 'eyJ0eXAiOiJKV1QiLCJhbGc...'
                },
                response_only=True
            ),
            400: OpenApiExample(
                'Validation Error',
                value={
                    'username': ['Username is already in use.'],
                    'email': ['Email is already in use.'],
                    'password': ["Password fields didn't match."]
                },
                response_only=True
            )
        },
        examples=[
            OpenApiExample(
                'Registration Request',
                value={
                    'username': 'john',
                    'email': 'john@example.com',
                    'password': 'SecurePass123!',
                    'password_confirm': 'SecurePass123!',
                    'first_name': 'John',
                    'last_name': 'Doe'
                },
                request_only=True
            )
        ]
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        return Response(
            {
                'user': UserSerializer(user).data,
                'access': user.access,
                'refresh': user.refresh,
            },
            status=status.HTTP_201_CREATED
        )
