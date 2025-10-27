from django.contrib import admin
from content.models import ListInvitation

@admin.register(ListInvitation)
class ListInvitationAdmin(admin.ModelAdmin):
    list_display = ['id', 'inviter', 'invitee', 'user_list', 'status', 'created_at', 'responded_at']
    list_filter = ['status', 'created_at']
    search_fields = ['inviter__username', 'invitee__username', 'user_list__name']
    readonly_fields = ['created_at', 'responded_at']
