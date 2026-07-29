from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0019_dynamic_user_lists'),
    ]

    operations = [
        migrations.CreateModel(
            name='GameDurationEstimate',
            fields=[
                (
                    'id',
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name='ID',
                    ),
                ),
                (
                    'provider',
                    models.CharField(
                        choices=[('igdb', 'IGDB')],
                        max_length=32,
                    ),
                ),
                ('provider_external_id', models.CharField(max_length=255)),
                ('main_story_seconds', models.PositiveIntegerField(blank=True, null=True)),
                ('main_extra_seconds', models.PositiveIntegerField(blank=True, null=True)),
                ('completionist_seconds', models.PositiveIntegerField(blank=True, null=True)),
                ('source_updated_at', models.DateTimeField(blank=True, null=True)),
                ('synced_at', models.DateTimeField(auto_now=True)),
                (
                    'status',
                    models.CharField(
                        choices=[
                            ('matched', 'Matched'),
                            ('no_data', 'No data'),
                            ('stale', 'Stale'),
                            ('error', 'Error'),
                        ],
                        default='no_data',
                        max_length=20,
                    ),
                ),
                ('sample_count', models.PositiveIntegerField(default=0)),
                ('retry_count', models.PositiveIntegerField(default=0)),
                ('last_error_code', models.CharField(blank=True, max_length=64)),
                ('payload_hash', models.CharField(blank=True, max_length=64)),
                (
                    'content_item',
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name='game_duration_estimates',
                        to='content.contentitem',
                    ),
                ),
            ],
            options={
                'db_table': 'content_game_duration_estimate',
                'indexes': [
                    models.Index(
                        fields=['provider', 'status'],
                        name='game_dur_provider_status_idx',
                    ),
                    models.Index(
                        fields=['status', 'source_updated_at'],
                        name='game_dur_status_updated_idx',
                    ),
                ],
                'constraints': [
                    models.UniqueConstraint(
                        fields=('content_item', 'provider'),
                        name='unique_game_duration_provider',
                    ),
                ],
            },
        ),
    ]
