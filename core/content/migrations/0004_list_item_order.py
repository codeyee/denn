from django.db import migrations, models
from django.db.models import Max

def backfill_list_order(apps, schema_editor):
    ListItem = apps.get_model('content', 'ListItem')

    # For each list, assign positions 1..n ordered by -added_at (newest first)
    list_ids = (
        ListItem.objects.values_list('user_list_id', flat=True).distinct()
    )
    for list_id in list_ids:
        items = list(
            ListItem.objects.filter(user_list_id=list_id).order_by('-added_at', 'id')
        )
        for idx, item in enumerate(items, start=1):
            item.list_order = idx
        if items:
            ListItem.objects.bulk_update(items, ['list_order'])

class Migration(migrations.Migration):

    dependencies = [
        ('content', '0003_list_invitation'),
    ]

    operations = [
        migrations.AddField(
            model_name='listitem',
            name='list_order',
            field=models.IntegerField(default=0, help_text='Order position within the list (1-based)'),
        ),
        migrations.AddIndex(
            model_name='listitem',
            index=models.Index(fields=['user_list', 'list_order'], name='content_lis_user_li_orde_idx'),
        ),
        migrations.RunPython(backfill_list_order, migrations.RunPython.noop),
        migrations.AddConstraint(
            model_name='listitem',
            constraint=models.UniqueConstraint(fields=['user_list', 'list_order'], name='unique_list_order_per_list'),
        ),
    ]

