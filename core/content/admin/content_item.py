from django.contrib import admin
from content.models import ContentItem

@admin.register(ContentItem)
class ContentItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'content_type', 'source_api', 'external_id', 'created_at']
    list_filter = ['content_type', 'source_api']
    search_fields = ['external_id']
    readonly_fields = ['created_at']
