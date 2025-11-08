from rest_framework import serializers
from .detail import MovieDetailSerializer

class BulkMovieItemSerializer(serializers.Serializer):
    key = serializers.IntegerField(help_text="The movie ID that was requested", required=False)
    id = serializers.IntegerField(help_text="The movie ID", required=False)
    data = MovieDetailSerializer(allow_null=True, help_text="Movie details")
    status_code = serializers.IntegerField(help_text="HTTP status code for this item")
    error = serializers.CharField(
        allow_null=True,
        help_text="Error message if request failed"
    )

class BulkMoviesResponseSerializer(serializers.Serializer):
    results = BulkMovieItemSerializer(many=True)
