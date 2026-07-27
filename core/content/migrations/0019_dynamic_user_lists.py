from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0018_tracking_collection_activity_index"),
    ]

    operations = [
        migrations.AlterField(
            model_name="userlist",
            name="list_type",
            field=models.CharField(
                choices=[
                    ("PERSONAL", "Personal"),
                    ("SHARED", "Shared"),
                    ("DYNAMIC", "Dynamic"),
                ],
                default="PERSONAL",
                help_text="List type",
                max_length=10,
            ),
        ),
        migrations.AddField(
            model_name="userlist",
            name="dynamic_key",
            field=models.CharField(
                blank=True,
                help_text="System-managed key for a dynamically populated list",
                max_length=32,
                null=True,
            ),
        ),
        migrations.AddIndex(
            model_name="userlist",
            index=models.Index(fields=["owner", "dynamic_key"], name="userlist_owner_dyn_key_idx"),
        ),
        migrations.AddConstraint(
            model_name="userlist",
            constraint=models.UniqueConstraint(
                fields=("owner", "dynamic_key"),
                name="unique_dynamic_list_key_per_owner",
            ),
        ),
    ]
