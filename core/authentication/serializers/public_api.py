from rest_framework import serializers

from content.serializers import LocalContentSummarySerializer

from .profile import PublicProfileIdentitySerializer


class PublicListSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField(allow_blank=True, allow_null=True)
    list_type = serializers.CharField()
    visibility = serializers.CharField()
    role = serializers.ChoiceField(choices=["owner", "member"])
    owner = serializers.DictField()
    collaborators = serializers.ListField(child=serializers.DictField())
    item_count = serializers.IntegerField()
    member_count = serializers.IntegerField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class PublicCompletedItemSerializer(serializers.Serializer):
    content = LocalContentSummarySerializer()
    completed_at = serializers.DateTimeField(allow_null=True)
    is_favorite = serializers.BooleanField()
    score = serializers.DecimalField(
        max_digits=3,
        decimal_places=1,
        allow_null=True,
    )


class PublicRatingItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    content = LocalContentSummarySerializer()
    score = serializers.DecimalField(max_digits=3, decimal_places=1)
    review = serializers.CharField(allow_blank=True, allow_null=True)
    spoiler = serializers.BooleanField()
    is_favorite = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class PublicProgressItemSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    content = LocalContentSummarySerializer()
    status = serializers.CharField()
    completed_at = serializers.DateTimeField(allow_null=True)
    is_favorite = serializers.BooleanField()
    rating = serializers.DictField(allow_null=True)
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class PublicProfileCountersSerializer(serializers.Serializer):
    completed = serializers.IntegerField()
    ratings = serializers.IntegerField()
    reviews = serializers.IntegerField()
    public_lists = serializers.IntegerField()
    completed_by_type = serializers.DictField(child=serializers.IntegerField())


class PublicProfileOverviewSerializer(serializers.Serializer):
    profile = PublicProfileIdentitySerializer()
    counters = PublicProfileCountersSerializer()
    favorites = serializers.DictField(
        child=serializers.ListField(child=serializers.DictField())
    )
    recent_reviews = PublicRatingItemSerializer(many=True)
    recent_completed = PublicCompletedItemSerializer(many=True)
    public_lists = PublicListSerializer(many=True)
    banner_media = serializers.ListField(child=serializers.DictField())
