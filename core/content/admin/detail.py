from django.contrib import admin

from content.models import (
    AlbumDetail,
    BookDetail,
    Episode,
    GameDetail,
    GameMode,
    GamePlatform,
    Genre,
    Image,
    MovieDetail,
    SeasonDetail,
    StreamingPlatform,
    Theme,
    Track,
    TvShowDetail,
)


class EpisodeInline(admin.TabularInline):
    model = Episode
    extra = 0
    fields = ['episode_number', 'title', 'release_date', 'duration_minutes']
    show_change_link = True


class TrackInline(admin.TabularInline):
    model = Track
    extra = 0
    fields = ['track_number', 'title', 'duration_seconds']
    show_change_link = True


class GamePlatformInline(admin.TabularInline):
    model = GamePlatform
    extra = 0


@admin.register(MovieDetail)
class MovieDetailAdmin(admin.ModelAdmin):
    list_display = ['id', 'content_item', 'title', 'release_date', 'last_refreshed_at']
    list_filter = ['status']
    search_fields = ['title', 'original_title', 'content_item__external_id']
    raw_id_fields = ['content_item']
    readonly_fields = ['last_refreshed_at', 'source_payload_hash']


@admin.register(TvShowDetail)
class TvShowDetailAdmin(admin.ModelAdmin):
    list_display = ['id', 'content_item', 'title', 'release_date', 'number_of_seasons', 'last_refreshed_at']
    list_filter = ['status']
    search_fields = ['title', 'original_title', 'content_item__external_id']
    raw_id_fields = ['content_item']
    readonly_fields = ['last_refreshed_at', 'source_payload_hash']


@admin.register(SeasonDetail)
class SeasonDetailAdmin(admin.ModelAdmin):
    list_display = ['id', 'content_item', 'tv_show_name', 'season_number', 'release_date', 'last_refreshed_at']
    search_fields = ['tv_show_name', 'title', 'content_item__external_id']
    raw_id_fields = ['content_item']
    readonly_fields = ['last_refreshed_at', 'source_payload_hash']
    inlines = [EpisodeInline]


@admin.register(AlbumDetail)
class AlbumDetailAdmin(admin.ModelAdmin):
    list_display = ['id', 'content_item', 'title', 'release_date', 'total_tracks', 'last_refreshed_at']
    search_fields = ['title', 'content_item__external_id']
    raw_id_fields = ['content_item']
    readonly_fields = ['last_refreshed_at', 'source_payload_hash']
    inlines = [TrackInline]


@admin.register(GameDetail)
class GameDetailAdmin(admin.ModelAdmin):
    list_display = ['id', 'content_item', 'title', 'release_date', 'game_type', 'last_refreshed_at']
    search_fields = ['title', 'series', 'content_item__external_id']
    raw_id_fields = ['content_item']
    readonly_fields = ['last_refreshed_at', 'source_payload_hash']
    inlines = [GamePlatformInline]


@admin.register(BookDetail)
class BookDetailAdmin(admin.ModelAdmin):
    list_display = ['id', 'content_item', 'title', 'release_date', 'pages', 'last_refreshed_at']
    search_fields = ['title', 'content_item__external_id']
    raw_id_fields = ['content_item']
    readonly_fields = ['last_refreshed_at', 'source_payload_hash']


@admin.register(Episode)
class EpisodeAdmin(admin.ModelAdmin):
    list_display = ['id', 'season_detail', 'season_number', 'episode_number', 'title']
    search_fields = ['title']
    raw_id_fields = ['season_detail']


@admin.register(Track)
class TrackAdmin(admin.ModelAdmin):
    list_display = ['id', 'album_detail', 'track_number', 'title']
    search_fields = ['title']
    raw_id_fields = ['album_detail']


@admin.register(Image)
class ImageAdmin(admin.ModelAdmin):
    list_display = ['id', 'content_item', 'type', 'size', 'position']
    list_filter = ['type', 'size']
    raw_id_fields = ['content_item']


@admin.register(StreamingPlatform)
class StreamingPlatformAdmin(admin.ModelAdmin):
    list_display = ['id', 'content_item', 'kind', 'name', 'country_code']
    list_filter = ['kind', 'country_code']
    search_fields = ['name']
    raw_id_fields = ['content_item']


@admin.register(GamePlatform)
class GamePlatformAdmin(admin.ModelAdmin):
    list_display = ['id', 'game_detail', 'name']
    search_fields = ['name']
    raw_id_fields = ['game_detail']


@admin.register(Genre)
class GenreAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'slug']
    search_fields = ['name']


@admin.register(Theme)
class ThemeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'slug']
    search_fields = ['name']


@admin.register(GameMode)
class GameModeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'slug']
    search_fields = ['name']
