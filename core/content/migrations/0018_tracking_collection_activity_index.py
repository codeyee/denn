from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0017_dynamic_collection_preference"),
    ]

    operations = [
        migrations.AddIndex(
            model_name="usercontenttracking",
            index=models.Index(
                fields=["user", "status", "-updated_at"],
                name="track_user_state_active_idx",
            ),
        ),
    ]
