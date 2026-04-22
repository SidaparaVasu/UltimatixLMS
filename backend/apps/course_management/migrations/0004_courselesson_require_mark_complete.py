from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('course_management', '0003_coursemaster_status_coursesection_description'),
    ]

    operations = [
        migrations.AddField(
            model_name='courselesson',
            name='require_mark_complete',
            field=models.BooleanField(
                default=False,
                help_text='Learner must explicitly mark this lesson complete (used for LINK-type lessons).',
            ),
        ),
    ]
