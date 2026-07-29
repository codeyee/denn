from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0020_gamedurationestimate'),
    ]

    operations = [
        migrations.RenameField(
            model_name='gamedurationestimate',
            old_name='main_story_seconds',
            new_name='hastily_seconds',
        ),
        migrations.RenameField(
            model_name='gamedurationestimate',
            old_name='main_extra_seconds',
            new_name='normally_seconds',
        ),
        migrations.RenameField(
            model_name='gamedurationestimate',
            old_name='completionist_seconds',
            new_name='completely_seconds',
        ),
        migrations.RemoveIndex(
            model_name='gamedurationestimate',
            name='game_dur_status_updated_idx',
        ),
        migrations.RemoveField(
            model_name='gamedurationestimate',
            name='source_updated_at',
        ),
    ]
