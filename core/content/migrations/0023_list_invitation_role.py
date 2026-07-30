from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0022_list_membership_roles"),
    ]

    operations = [
        migrations.AddField(
            model_name="listinvitation",
            name="role",
            field=models.CharField(
                choices=[("EDITOR", "Editor"), ("VIEWER", "Viewer")],
                default="EDITOR",
                help_text="Role granted when the invitation is accepted",
                max_length=10,
            ),
        ),
    ]
