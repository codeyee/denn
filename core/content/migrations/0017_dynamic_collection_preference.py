from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("content", "0016_seed_personal_list_backlog"),
    ]

    operations = [
        migrations.CreateModel(
            name="DynamicCollectionPreference",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "collection_key",
                    models.CharField(
                        choices=[
                            ("backlog", "Backlog"),
                            ("in-progress", "In progress"),
                            ("on-hold", "On hold"),
                            ("dropped", "Dropped"),
                            ("completed", "Completed"),
                            ("movies", "Movies"),
                            ("series", "Series"),
                            ("games", "Games"),
                            ("albums", "Albums"),
                            ("books", "Books"),
                        ],
                        max_length=32,
                    ),
                ),
                ("enabled", models.BooleanField(default=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="dynamic_collection_preferences",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={"db_table": "dynamic_collection_preferences"},
        ),
        migrations.AddConstraint(
            model_name="dynamiccollectionpreference",
            constraint=models.UniqueConstraint(
                fields=("user", "collection_key"),
                name="unique_user_dynamic_collection_preference",
            ),
        ),
    ]
