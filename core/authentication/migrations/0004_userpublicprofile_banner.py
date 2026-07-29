from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("authentication", "0003_userpreferences_dynamic_collections_enabled"),
        ("content", "0019_dynamic_user_lists"),
    ]

    operations = [
        migrations.AddField(
            model_name="userpublicprofile",
            name="banner_content_item",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to="content.contentitem",
            ),
        ),
        migrations.AddField(
            model_name="userpublicprofile",
            name="banner_image",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="+",
                to="content.image",
            ),
        ),
    ]
