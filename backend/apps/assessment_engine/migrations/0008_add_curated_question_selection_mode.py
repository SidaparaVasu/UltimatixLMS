from django.db import migrations, models


class Migration(migrations.Migration):
    """
    Adds CURATED as a valid choice for AssessmentMaster.question_selection_mode.

    No data migration needed — existing rows stay DYNAMIC or FIXED.
    The field is a CharField with choices; adding a new choice value is
    backward-compatible and requires no column alteration.
    """

    dependencies = [
        ('assessment_engine', '0007_questionbank_created_by'),
    ]

    operations = [
        migrations.AlterField(
            model_name='assessmentmaster',
            name='question_selection_mode',
            field=models.CharField(
                choices=[
                    ('FIXED',   'Fixed \u2014 questions pre-mapped at assessment creation (course quizzes)'),
                    ('DYNAMIC', 'Dynamic \u2014 questions selected from bank at attempt start (standalone)'),
                    ('CURATED', 'Curated \u2014 manually selects questions from question bank (standalone)'),
                ],
                default='FIXED',
                help_text=(
                    'FIXED: questions are pre-mapped at creation time (course quizzes). '
                    'DYNAMIC: questions are selected from the bank at attempt start (standalone). '
                    'CURATED: manually selects questions from question bank (standalone).'
                ),
                max_length=20,
            ),
        ),
    ]
