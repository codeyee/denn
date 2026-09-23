from rest_framework import serializers


class ModerationSummarySerializer(serializers.Serializer):
    """Public, read-only moderation fields safe for content responses."""

    status = serializers.ChoiceField(
        choices=("missing", "pending", "complete", "stale", "error"),
        read_only=True,
    )
    classification = serializers.ChoiceField(
        choices=("safe", "explicit", "needs_review"),
        allow_null=True,
        read_only=True,
    )
