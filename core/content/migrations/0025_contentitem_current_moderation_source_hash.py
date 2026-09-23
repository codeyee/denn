from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0024_contentmoderationjudgment"),
    ]

    operations = [
        migrations.AddField(
            model_name="contentitem",
            name="current_moderation_source_hash",
            field=models.CharField(
                blank=True,
                help_text=(
                    "Hash of the current normalized moderation text; null means the "
                    "freshness state is unverified"
                ),
                max_length=64,
                null=True,
            ),
        ),
    ]
