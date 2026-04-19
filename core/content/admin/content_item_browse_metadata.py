from django.contrib import admin

from content.models import ContentItemBrowseMetadata


@admin.register(ContentItemBrowseMetadata)
class ContentItemBrowseMetadataAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'content_item',
        'display_title',
        'artist',
        'release_date',
        'last_refreshed_at',
    ]
    list_filter = ['content_item__content_type', 'content_item__source_api']
    search_fields = ['display_title', 'artist', 'album_title', 'content_item__external_id']
    raw_id_fields = ['content_item']
    readonly_fields = ['last_refreshed_at', 'source_payload_hash']
