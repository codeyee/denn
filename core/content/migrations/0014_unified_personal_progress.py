from django.db import migrations, models


def normalize_personal_progress(apps, schema_editor):
    ListItem = apps.get_model("content", "ListItem")
    Rating = apps.get_model("content", "Rating")
    UserContentTracking = apps.get_model("content", "UserContentTracking")

    for rating in Rating.objects.filter(is_active=True).iterator():
        tracking, created = UserContentTracking.objects.get_or_create(
            user_id=rating.user_id,
            content_item_id=rating.content_item_id,
            defaults={
                "status": "completed",
                "last_completed_at": rating.created_at,
            },
        )
        if not created and tracking.status != "completed":
            tracking.status = "completed"
            tracking.last_completed_at = (
                tracking.last_completed_at or rating.created_at
            )
            tracking.save(update_fields=["status", "last_completed_at"])

    personal_completed = ListItem.objects.filter(
        user_list__list_type="PERSONAL",
        context_status="COMPLETED",
    ).select_related("user_list")
    for item in personal_completed.iterator():
        owner_id = item.user_list.owner_id
        tracking, created = UserContentTracking.objects.get_or_create(
            user_id=owner_id,
            content_item_id=item.content_item_id,
            defaults={
                "status": "completed",
                "last_completed_at": item.context_completed_at or item.added_at,
            },
        )
        if not created and tracking.status != "completed":
            tracking.status = "completed"
            tracking.last_completed_at = (
                tracking.last_completed_at
                or item.context_completed_at
                or item.added_at
            )
            tracking.save(update_fields=["status", "last_completed_at"])

    ListItem.objects.filter(user_list__list_type="PERSONAL").update(
        context_status=None,
        context_completed_at=None,
    )
    UserContentTracking.objects.filter(is_favorite=True).exclude(
        status="completed",
    ).update(
        is_favorite=False,
        favorited_at=None,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0013_usercontenttracking_rating_is_active_rating_spoiler_and_more"),
    ]

    operations = [
        migrations.RenameField(
            model_name="listitem",
            old_name="status",
            new_name="context_status",
        ),
        migrations.RenameField(
            model_name="listitem",
            old_name="completed_at",
            new_name="context_completed_at",
        ),
        migrations.RemoveIndex(
            model_name="listitem",
            name="list_items_user_li_6351cd_idx",
        ),
        migrations.AlterField(
            model_name="listitem",
            name="context_status",
            field=models.CharField(
                blank=True,
                choices=[("PENDING", "Pending"), ("COMPLETED", "Completed")],
                default=None,
                help_text=(
                    "Shared-list context; personal progress lives in tracking"
                ),
                max_length=10,
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name="listitem",
            name="context_completed_at",
            field=models.DateTimeField(
                blank=True,
                help_text="Date and time of contextual shared-list completion",
                null=True,
            ),
        ),
        migrations.AddIndex(
            model_name="listitem",
            index=models.Index(
                fields=["user_list", "context_status"],
                name="list_items_context_4aac12_idx",
            ),
        ),
        migrations.RunPython(normalize_personal_progress, migrations.RunPython.noop),
    ]
