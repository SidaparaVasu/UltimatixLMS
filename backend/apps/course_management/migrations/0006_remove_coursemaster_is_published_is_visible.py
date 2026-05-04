"""
Migration 0006 — remove dead columns is_published and is_visible from course_master.

These fields were never read by any view, service, or repository.
Visibility is fully controlled by the `status` field (DRAFT/PUBLISHED/ARCHIVED).
`is_active` handles soft-delete / admin disable.
"""

from django.db import migrations, connection


def remove_field_if_exists(table, column):
    """Return a RunSQL operation that drops a column only if it exists."""
    def forwards(apps, schema_editor):
        with connection.cursor() as cursor:
            cursor.execute(
                "SELECT COUNT(*) FROM information_schema.COLUMNS "
                "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s AND COLUMN_NAME = %s",
                [table, column],
            )
            if cursor.fetchone()[0]:
                cursor.execute(f"ALTER TABLE `{table}` DROP COLUMN `{column}`")
    return migrations.RunPython(forwards, migrations.RunPython.noop)


class Migration(migrations.Migration):

    dependencies = [
        ('course_management', '0005_coursemaster_dates_marks_courseparticipant'),
    ]

    operations = [
        remove_field_if_exists('course_management_coursemaster', 'is_published'),
        remove_field_if_exists('course_management_coursemaster', 'is_visible'),
        # Keep Django's state in sync regardless of whether the DB columns existed
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(model_name='coursemaster', name='is_published'),
                migrations.RemoveField(model_name='coursemaster', name='is_visible'),
            ],
            database_operations=[],  # already handled above
        ),
    ]
