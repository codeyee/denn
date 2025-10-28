from rest_framework import generics, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from authentication.serializers import RegisterSerializer, UserSerializer

class RegisterView(generics.CreateAPIView):
    permission_classes = [AllowAny]
    serializer_class = RegisterSerializer

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
