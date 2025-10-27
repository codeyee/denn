from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

class EmailLoginSerializer(serializers.Serializer):
    email = serializers.EmailField(required=True)

    password = serializers.CharField(
        style={'input_type': 'password'},
        trim_whitespace=False,
        write_only=True
    )

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            # Get user by email
            try:
                user = User.objects.get(email=email)
                username = user.username
            except User.DoesNotExist:
                raise serializers.ValidationError(
                    _('Unable to log in with provided credentials.'),
                    code='authorization'
                )

            user = authenticate(
                request=self.context.get('request'),
                username=username,
                password=password
            )

            if not user:
                raise serializers.ValidationError(
                    _('Unable to log in with provided credentials.'),
                    code='authorization'
                )

            if not user.is_active:
                raise serializers.ValidationError(
                    _('User account is disabled.'),
                    code='authorization'
                )

        else:
            raise serializers.ValidationError(
                _('Must include "email" and "password".'),
                code='authorization'
            )

        attrs['user'] = user
        return attrs
