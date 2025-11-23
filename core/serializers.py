from rest_framework import serializers
from rest_flex_fields import FlexFieldsModelSerializer

class BaseFlexSerializer(FlexFieldsModelSerializer):
    """Base class for all application serializers supporting dynamic fields and expansion"""
    pass
