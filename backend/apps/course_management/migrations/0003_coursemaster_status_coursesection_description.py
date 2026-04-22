from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('course_management', '0002_coursecontent_file_ref_courseresource_file_ref'),
    ]

    operations = [
        migrations.AddField(
            model_name='coursemaster',
            name='status',
            field=models.CharField(
                choices=[('DRAFT', 'Draft'), ('PUBLISHED', 'Published'), ('ARCHIVED', 'Archived')],
                default='DRAFT',
                db_index=True,
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='coursesection',
            name='description',
            field=models.TextField(blank=True, default=''),
        ),
    ]
