from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('skill_management', '0004_remove_employeeskillrating_uniq_employee_skill_rating_type_and_more'),
        ('org_management', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='employeeskillhistory',
            name='changed_by',
            field=models.ForeignKey(
                blank=True,
                help_text='Employee who triggered the change. Null means system/auto.',
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='skill_changes_made',
                to='org_management.employeemaster',
            ),
        ),
        migrations.AddField(
            model_name='employeeskillhistory',
            name='change_reason',
            field=models.CharField(
                choices=[
                    ('SELF_RATING',         'Self Rating'),
                    ('MANAGER_RATING',      'Manager Rating'),
                    ('ASSESSMENT_AUTO',     'Assessment \u2014 Auto Assigned'),
                    ('ASSESSMENT_APPROVED', 'Assessment \u2014 Approved'),
                    ('ADMIN_OVERRIDE',      'Admin Override'),
                ],
                default='ADMIN_OVERRIDE',
                help_text='Why the skill level changed.',
                max_length=30,
            ),
        ),
    ]
