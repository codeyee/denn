from django.db import migrations


BATCH_SIZE = 1000


def seed_personal_list_backlog(apps, schema_editor):
    ListItem = apps.get_model("content", "ListItem")
    UserContentTracking = apps.get_model("content", "UserContentTracking")
    database = schema_editor.connection.alias

    pairs = (
        ListItem.objects.using(database)
        .filter(user_list__list_type="PERSONAL")
        .order_by()
        .values_list("user_list__owner_id", "content_item_id")
        .distinct()
    )
    pending = []
    for user_id, content_item_id in pairs.iterator(chunk_size=BATCH_SIZE):
        pending.append(
            UserContentTracking(
                user_id=user_id,
                content_item_id=content_item_id,
                status="backlog",
            )
        )
        if len(pending) == BATCH_SIZE:
            _insert_missing(UserContentTracking, database, pending)
            pending = []

    if pending:
        _insert_missing(UserContentTracking, database, pending)


def _insert_missing(UserContentTracking, database, rows):
    UserContentTracking.objects.using(database).bulk_create(
        rows,
        batch_size=BATCH_SIZE,
        ignore_conflicts=True,
    )


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0015_tracking_favorite_requires_completed"),
    ]

    operations = [
        migrations.RunPython(
            seed_personal_list_backlog,
            migrations.RunPython.noop,
        ),
    ]
