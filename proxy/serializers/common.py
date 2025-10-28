from rest_framework import serializers

class PaginationMetadataSerializer(serializers.Serializer):
    page = serializers.IntegerField(help_text="Current page number")
    page_results = serializers.IntegerField(help_text="Number of results in current page")
    total_pages = serializers.IntegerField(help_text="Total number of pages")
    total_results = serializers.IntegerField(help_text="Total number of results")

class ErrorResponseSerializer(serializers.Serializer):
    error = serializers.CharField(help_text="Error code")
    message = serializers.CharField(help_text="Human-readable error message")
