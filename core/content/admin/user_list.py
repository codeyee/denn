from django.contrib import admin
from content.models import ListMembership, UserList


class ListMembershipInline(admin.TabularInline):
    model = ListMembership
    extra = 0
    autocomplete_fields = ['user']

@admin.register(UserList)
class UserListAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'owner', 'list_type', 'created_at']
    list_filter = ['list_type', 'created_at']
    search_fields = ['name', 'owner__username']
    readonly_fields = ['created_at', 'updated_at']
    inlines = [ListMembershipInline]


@admin.register(ListMembership)
class ListMembershipAdmin(admin.ModelAdmin):
    list_display = ['user_list', 'user', 'role']
    list_filter = ['role']
    search_fields = ['user_list__name', 'user__username']
