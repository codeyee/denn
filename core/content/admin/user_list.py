from django.contrib import admin
from content.models import UserList

@admin.register(UserList)
class UserListAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'owner', 'list_type', 'created_at']
    list_filter = ['list_type', 'created_at']
    search_fields = ['name', 'owner__username']
    readonly_fields = ['created_at', 'updated_at']
    filter_horizontal = ['members']
