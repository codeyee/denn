from django.contrib import admin

from content.models import ContentModerationJudgment


@admin.register(ContentModerationJudgment)
class ContentModerationJudgmentAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'content_item',
        'status',
        'classification',
        'model_name',
        'question_revision',
        'policy_revision',
        'requested_at',
    ]
    list_filter = ['status', 'classification', 'model_name']
    search_fields = ['content_item__external_id', 'source_data_hash', 'error_code']
    raw_id_fields = ['content_item']
    readonly_fields = ['requested_at']
    list_select_related = ['content_item']
