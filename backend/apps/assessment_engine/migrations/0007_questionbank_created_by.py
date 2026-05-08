from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('assessment_engine', '0006_standalone_assessment_models'),
        ('org_management', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='questionbank',
            name='created_by',
            field=models.ForeignKey(
                blank=True,
                help_text='Employee who created this question. Used to filter by organisation.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='created_questions',
                to='org_management.employeemaster',
            ),
        ),
    ]
