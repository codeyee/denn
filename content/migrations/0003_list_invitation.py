import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('content', '0002_add_rating_cache_to_content_item'),
    ]

    operations = [
        migrations.CreateModel(
            name='ListInvitation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('status', models.CharField(choices=[('PENDING', 'Pending'), ('ACCEPTED', 'Accepted'), ('REJECTED', 'Rejected')], default='PENDING', help_text='Invitation status', max_length=10)),
                ('created_at', models.DateTimeField(auto_now_add=True, help_text='Date and time of invitation')),
                ('responded_at', models.DateTimeField(blank=True, help_text='Date and time of response (accepted/rejected)', null=True)),
                ('invitee', models.ForeignKey(help_text='User who received the invitation', on_delete=django.db.models.deletion.CASCADE, related_name='received_invitations', to=settings.AUTH_USER_MODEL)),
                ('inviter', models.ForeignKey(help_text='User who sent the invitation', on_delete=django.db.models.deletion.CASCADE, related_name='sent_invitations', to=settings.AUTH_USER_MODEL)),
                ('user_list', models.ForeignKey(help_text='List to which the user is invited', on_delete=django.db.models.deletion.CASCADE, related_name='invitations', to='content.userlist')),
            ],
            options={
                'db_table': 'list_invitations',
                'ordering': ['-created_at'],
                'indexes': [
                    models.Index(fields=['invitee', 'status'], name='list_invita_invitee_idx'),
                    models.Index(fields=['user_list', 'status'], name='list_invita_userlist_idx'),
                    models.Index(fields=['-created_at'], name='list_invita_created_idx'),
                ],
            },
        ),
        migrations.AddConstraint(
            model_name='listinvitation',
            constraint=models.UniqueConstraint(fields=('user_list', 'invitee'), name='unique_list_invitation'),
        ),
    ]
