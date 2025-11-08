from rest_framework import serializers
from .detail import TVShowDetailSerializer
from .season import TVSeasonDetailSerializer

class BulkTVShowItemSerializer(serializers.Serializer):
    key = serializers.IntegerField(help_text="The TV show ID that was requested", required=False)
    id = serializers.IntegerField(help_text="The TV show ID", required=False)
    data = TVShowDetailSerializer(allow_null=True, help_text="TV show details")
    status_code = serializers.IntegerField(help_text="HTTP status code for this item")
    error = serializers.CharField(
        allow_null=True,
        help_text="Error message if request failed"
    )

class BulkSeasonItemSerializer(serializers.Serializer):
    tv_id = serializers.IntegerField(help_text="The TV show ID")
    season_number = serializers.IntegerField(help_text="The season number")
    data = TVSeasonDetailSerializer(allow_null=True, help_text="Season details")
    status_code = serializers.IntegerField(help_text="HTTP status code for this item")
    error = serializers.CharField(
        allow_null=True,
        help_text="Error message if request failed"
    )

class BulkTVShowsResponseSerializer(serializers.Serializer):
    results = BulkTVShowItemSerializer(many=True)

class BulkSeasonsResponseSerializer(serializers.Serializer):
    results = BulkSeasonItemSerializer(many=True)
