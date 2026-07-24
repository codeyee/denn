from rest_framework import serializers

from authentication.serializers.user import UserSerializer


class SessionUserSerializer(serializers.Serializer):
    user = serializers.SerializerMethodField()

    def get_user(self, obj):
        return UserSerializer(obj['user'], context=self.context).data
