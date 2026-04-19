from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiExample
from authentication.serializers import RegisterSerializer, UserSerializer
from core.throttling import AuthRateThrottle

@extend_schema(
    tags=['Authentication'],
    summary='Register a new user',
    description='''
    Create a new user account and return authentication tokens.

    The user will be automatically logged in after successful registration.
    ''',
    request=RegisterSerializer,
    responses={
        201: OpenApiExample(
            'Registration Success',
            value={
                'user': {
                    'id': 1,
                    'username': 'newuser',
                    'email': 'user@example.com',
                    'first_name': 'John',
                    'last_name': 'Doe'
                },
                'access': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
                'refresh': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'
            }
        ),
        400: OpenApiExample(
            'Validation Error',
            value={
                'username': ['Username is already in use.'],
                'email': ['Email is already in use.'],
                'password': ['Password fields didn\'t match.']
            }
        )
    },
    examples=[
        OpenApiExample(
            'Register New User',
            value={
                'username': 'newuser',
                'email': 'user@example.com',
                'password': 'securepassword123',
                'password_confirm': 'securepassword123',
                'first_name': 'John',
                'last_name': 'Doe'
            },
            request_only=True
        )
    ]
)
class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer
    throttle_classes = [AuthRateThrottle]  # Rate limit: 5 requests/minute

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
