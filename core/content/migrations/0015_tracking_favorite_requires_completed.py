from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0014_unified_personal_progress"),
    ]

    operations = [
        migrations.AddConstraint(
            model_name="usercontenttracking",
            constraint=models.CheckConstraint(
                condition=Q(is_favorite=False) | Q(status="completed"),
                name="tracking_favorite_requires_completed",
            ),
        ),
    ]
