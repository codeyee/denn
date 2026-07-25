import logging
from typing import Optional

from rest_framework import serializers

from content.models import ContentItem


logger = logging.getLogger(__name__)


class LocalContentSummarySerializer(serializers.Serializer):
    id = serializers.IntegerField()
    type = serializers.CharField(source="content_type")
    title = serializers.SerializerMethodField()
    subtitle = serializers.SerializerMethodField()
    date = serializers.SerializerMethodField()
    poster = serializers.SerializerMethodField()
    backdrop = serializers.SerializerMethodField()

    def get_title(self, obj) -> str:
        browse_meta = self._related(obj, "browse_meta")
        detail = self._detail(obj)
        title = (
            getattr(browse_meta, "display_title", "")
            or getattr(detail, "title", "")
            or getattr(detail, "tv_show_name", "")
        )
        if title:
            return title

        logger.warning(
            "profile_content_metadata_missing",
            extra={
                "event": "profile_content_metadata_missing",
                "content_item_id": obj.id,
                "content_type": obj.content_type,
            },
        )
        return f"Untitled {obj.get_content_type_display()}"

    def get_subtitle(self, obj) -> Optional[str]:
        browse_meta = self._related(obj, "browse_meta")
        detail = self._detail(obj)
        if obj.content_type == ContentItem.ContentType.ALBUM:
            return getattr(browse_meta, "artist", "") or None
        if obj.content_type == ContentItem.ContentType.SEASON:
            return getattr(detail, "tv_show_name", "") or None
        return None

    def get_date(self, obj) -> Optional[str]:
        browse_meta = self._related(obj, "browse_meta")
        detail = self._detail(obj)
        value = getattr(browse_meta, "release_date", None) or getattr(
            detail,
            "release_date",
            None,
        )
        return value.isoformat() if value else None

    def get_poster(self, obj) -> Optional[str]:
        detail = self._detail(obj)
        return getattr(detail, "image_url", "") or None

    def get_backdrop(self, obj) -> Optional[str]:
        detail = self._detail(obj)
        return getattr(detail, "image_url", "") or None

    def _detail(self, obj):
        related_name = {
            ContentItem.ContentType.MOVIE: "movie_detail",
            ContentItem.ContentType.TV_SHOW: "tv_show_detail",
            ContentItem.ContentType.SEASON: "season_detail",
            ContentItem.ContentType.GAME: "game_detail",
            ContentItem.ContentType.ALBUM: "album_detail",
            ContentItem.ContentType.BOOK: "book_detail",
        }.get(obj.content_type)
        return self._related(obj, related_name) if related_name else None

    @staticmethod
    def _related(obj, related_name):
        try:
            return getattr(obj, related_name)
        except Exception:
            return None
