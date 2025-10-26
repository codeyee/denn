from django.contrib import admin
from content.models import Rating

@admin.register(Rating)
class RatingAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'content_item', 'score', 'created_at']
    list_filter = ['score', 'created_at']
    search_fields = ['user__username', 'comment']
    readonly_fields = ['created_at', 'updated_at']
