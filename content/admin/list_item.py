from django.contrib import admin
from content.models import ListItem

@admin.register(ListItem)
class ListItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'user_list', 'content_item', 'added_by', 'status', 'added_at']
    list_filter = ['status', 'added_at']
    search_fields = ['user_list__name', 'added_by__username']
    readonly_fields = ['added_at', 'completed_at']
