from django.conf import settings
from django.db import migrations, models
from django.db.models import Q
import django.db.models.deletion


OWNER = "OWNER"
EDITOR = "EDITOR"
VIEWER = "VIEWER"


def seed_owner_memberships(apps, schema_editor):
    UserList = apps.get_model("content", "UserList")
    ListMembership = apps.get_model("content", "ListMembership")
    database = schema_editor.connection.alias

    editable_lists = UserList.objects.using(database).filter(
        list_type__in=["PERSONAL", "SHARED"],
    )
    for user_list in editable_lists.iterator():
        ListMembership.objects.using(database).filter(
            user_list_id=user_list.id,
            role=OWNER,
        ).exclude(user_id=user_list.owner_id).update(role=EDITOR)
        ListMembership.objects.using(database).get_or_create(
            user_list_id=user_list.id,
            user_id=user_list.owner_id,
            defaults={"role": OWNER},
        )
        ListMembership.objects.using(database).filter(
            user_list_id=user_list.id,
            user_id=user_list.owner_id,
        ).update(role=OWNER)


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0021_rename_game_duration_metrics"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.CreateModel(
                    name="ListMembership",
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
                            "role",
                            models.CharField(
                                choices=[
                                    (OWNER, "Owner"),
                                    (EDITOR, "Editor"),
                                    (VIEWER, "Viewer"),
                                ],
                                default=EDITOR,
                                max_length=10,
                            ),
                        ),
                        (
                            "user",
                            models.ForeignKey(
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="list_memberships",
                                to=settings.AUTH_USER_MODEL,
                            ),
                        ),
                        (
                            "user_list",
                            models.ForeignKey(
                                db_column="userlist_id",
                                on_delete=django.db.models.deletion.CASCADE,
                                related_name="memberships",
                                to="content.userlist",
                            ),
                        ),
                    ],
                    options={
                        "db_table": "user_lists_members",
                        "constraints": [
                            models.UniqueConstraint(
                                fields=("user_list", "user"),
                                name="unique_list_membership",
                            ),
                            models.UniqueConstraint(
                                condition=Q(role=OWNER),
                                fields=("user_list",),
                                name="unique_list_owner_membership",
                            ),
                            models.CheckConstraint(
                                condition=Q(role__in=[OWNER, EDITOR, VIEWER]),
                                name="valid_list_membership_role",
                            ),
                        ],
                    },
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.AddField(
                    model_name="listmembership",
                    name="role",
                    field=models.CharField(
                        choices=[
                            (OWNER, "Owner"),
                            (EDITOR, "Editor"),
                            (VIEWER, "Viewer"),
                        ],
                        default=EDITOR,
                        max_length=10,
                    ),
                    preserve_default=False,
                ),
            ],
        ),
        migrations.RunPython(seed_owner_memberships, migrations.RunPython.noop),
        migrations.SeparateDatabaseAndState(
            database_operations=[
                migrations.AddConstraint(
                    model_name="listmembership",
                    constraint=models.UniqueConstraint(
                        condition=Q(role=OWNER),
                        fields=("user_list",),
                        name="unique_list_owner_membership",
                    ),
                ),
                migrations.AddConstraint(
                    model_name="listmembership",
                    constraint=models.CheckConstraint(
                        condition=Q(role__in=[OWNER, EDITOR, VIEWER]),
                        name="valid_list_membership_role",
                    ),
                ),
            ],
        ),
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name="userlist",
                    name="members",
                    field=models.ManyToManyField(
                        blank=True,
                        help_text="Members of the list (roles are stored in ListMembership)",
                        related_name="member_lists",
                        through="content.ListMembership",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
        ),
    ]
