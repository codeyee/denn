# Generated manually for the dynamic collections preference.

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("authentication", "0002_userpublicprofile"),
    ]

    operations = [
        migrations.AddField(
            model_name="userpreferences",
            name="dynamic_collections_enabled",
            field=models.BooleanField(default=True),
        ),
    ]
