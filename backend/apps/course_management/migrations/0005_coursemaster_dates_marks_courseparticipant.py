"""
Migration 0005 — add new fields to CourseMaster and create CourseParticipant.

On existing databases these objects were created directly; on fresh databases
(e.g. test environments) they must be created by this migration.
SeparateDatabaseAndState is used so Django's state is always updated, while
the actual DB operations are guarded to be idempotent.
"""

from django.db import migrations, models, connection
import django.db.models.deletion


def create_course_participant_if_not_exists(apps, schema_editor):
    """Create course_participant table only if it doesn't already exist."""
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT COUNT(*) FROM information_schema.TABLES "
            "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'course_participant'"
        )
        if cursor.fetchone()[0] == 0:
            cursor.execute("""
                CREATE TABLE `course_participant` (
                    `id` bigint NOT NULL AUTO_INCREMENT,
                    `invited_at` datetime(6) NOT NULL,
                    `invite_acknowledged` tinyint(1) NOT NULL DEFAULT 0,
                    `course_id` bigint NOT NULL,
                    `employee_id` bigint NOT NULL,
                    `invited_by_id` bigint DEFAULT NULL,
                    PRIMARY KEY (`id`),
                    KEY `idx_crs_participant_course` (`course_id`),
                    KEY `idx_crs_participant_emp` (`employee_id`),
                    CONSTRAINT `course_participant_course_id_fk`
                        FOREIGN KEY (`course_id`) REFERENCES `course_master` (`id`),
                    CONSTRAINT `course_participant_employee_id_fk`
                        FOREIGN KEY (`employee_id`) REFERENCES `org_employee_master` (`id`),
                    CONSTRAINT `course_participant_invited_by_id_fk`
                        FOREIGN KEY (`invited_by_id`) REFERENCES `org_employee_master` (`id`)
                )
            """)


def add_coursemaster_fields_if_not_exists(apps, schema_editor):
    """Add new CourseMaster columns only if they don't already exist."""
    with connection.cursor() as cursor:
        def col_exists(col):
            cursor.execute(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'course_master' AND COLUMN_NAME = %s",
                [col]
            )
            return cursor.fetchone()[0] > 0

        if not col_exists('start_date'):
            cursor.execute("ALTER TABLE `course_master` ADD COLUMN `start_date` date NULL")
        if not col_exists('end_date'):
            cursor.execute("ALTER TABLE `course_master` ADD COLUMN `end_date` date NULL")
        if not col_exists('show_marks_to_learner'):
            cursor.execute("ALTER TABLE `course_master` ADD COLUMN `show_marks_to_learner` tinyint(1) NOT NULL DEFAULT 0")
        if not col_exists('is_published'):
            cursor.execute("ALTER TABLE `course_master` ADD COLUMN `is_published` tinyint(1) NOT NULL DEFAULT 0")
            cursor.execute("ALTER TABLE `course_master` ADD INDEX `course_master_is_published_idx` (`is_published`)")
        if not col_exists('is_visible'):
            cursor.execute("ALTER TABLE `course_master` ADD COLUMN `is_visible` tinyint(1) NOT NULL DEFAULT 0")


class Migration(migrations.Migration):

    dependencies = [
        ('course_management', '0004_courselesson_require_mark_complete'),
        ('org_management', '0001_initial'),
    ]

    operations = [
        # Run actual DB operations (idempotent — safe on both fresh and existing DBs)
        migrations.RunPython(add_coursemaster_fields_if_not_exists, migrations.RunPython.noop),
        migrations.RunPython(create_course_participant_if_not_exists, migrations.RunPython.noop),

        # Update Django's internal state to match
        migrations.SeparateDatabaseAndState(
            database_operations=[],
            state_operations=[
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
