"""
Migration 0005 — sync Django migration state with the actual database.

All columns and tables were created directly in the DB before this migration
was written. This migration performs NO database operations — it only updates
Django's internal migration state so subsequent migrations work correctly.

Pre-existing DB objects being registered:
  course_master:
    - start_date          (date, nullable)
    - end_date            (date, nullable)
    - show_marks_to_learner (tinyint, maps to show_marks_to_learners in Python)
    - is_published        (tinyint, indexed)
    - is_visible          (tinyint)

  course_participant:     (entire table)
    - id, course_id, employee_id, invited_by_id, invited_at,
      invite_acknowledged (maps to notification_sent in Python)
    - idx_crs_participant_course, idx_crs_participant_emp
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('course_management', '0004_courselesson_require_mark_complete'),
        ('org_management', '0001_initial'),
    ]

    operations = [
        # Everything is SeparateDatabaseAndState — DB already has all of this.
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
                # ── CourseMaster new fields ───────────────────────────────────
                migrations.AddField(
                    model_name='coursemaster',
                    name='start_date',
                    field=models.DateField(blank=True, null=True,
                        help_text='Date from which the course becomes accessible to participants.'),
                ),
                migrations.AddField(
                    model_name='coursemaster',
                    name='end_date',
                    field=models.DateField(blank=True, null=True,
                        help_text='Date after which the course is no longer accessible.'),
                ),
                migrations.AddField(
                    model_name='coursemaster',
                    name='show_marks_to_learners',
                    field=models.BooleanField(default=False, db_column='show_marks_to_learner',
                        help_text='If enabled, learners can see their assessment scores after completion.'),
                ),
                migrations.AddField(
                    model_name='coursemaster',
                    name='is_published',
                    field=models.BooleanField(default=False, db_index=True),
                ),
                migrations.AddField(
                    model_name='coursemaster',
                    name='is_visible',
                    field=models.BooleanField(default=False),
                ),

                # ── CourseParticipant model (table already exists) ────────────
                migrations.CreateModel(
                    name='CourseParticipant',
                    fields=[
                        ('id', models.BigAutoField(auto_created=True, primary_key=True,
                            serialize=False, verbose_name='ID')),
                        ('invited_at', models.DateTimeField(auto_now_add=True)),
                        ('notification_sent', models.BooleanField(
                            default=False, db_column='invite_acknowledged',
                            help_text='Whether an invitation email has been dispatched.')),
                        ('course', models.ForeignKey(
                            on_delete=django.db.models.deletion.CASCADE,
                            related_name='participants',
                            to='course_management.coursemaster')),
                        ('employee', models.ForeignKey(
                            on_delete=django.db.models.deletion.CASCADE,
                            related_name='course_invitations',
                            to='org_management.employeemaster')),
                        ('invited_by', models.ForeignKey(
                            blank=True, null=True,
                            on_delete=django.db.models.deletion.SET_NULL,
                            related_name='sent_course_invitations',
                            to='org_management.employeemaster')),
                    ],
                    options={
                        'verbose_name': 'Course Participant',
                        'verbose_name_plural': 'Course Participants',
                        'db_table': 'course_participant',
                    },
                ),
                migrations.AddIndex(
                    model_name='courseparticipant',
                    index=models.Index(fields=['course'], name='idx_crs_participant_course'),
                ),
                migrations.AddIndex(
                    model_name='courseparticipant',
                    index=models.Index(fields=['employee'], name='idx_crs_participant_emp'),
                ),
            ],
        ),
    ]
