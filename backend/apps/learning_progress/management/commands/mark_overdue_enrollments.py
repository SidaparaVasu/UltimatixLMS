"""
Management command: mark_overdue_enrollments

Marks mandatory course enrollments as OVERDUE when their effective deadline
(extended_due_date if set, otherwise course.end_date) has passed and the
learner has not yet completed the course.

Usage:
    python manage.py mark_overdue_enrollments
    python manage.py mark_overdue_enrollments --dry-run

Schedule this via cron or a task scheduler (e.g. Celery beat) to run daily.
"""

from django.core.management.base import BaseCommand
from apps.learning_progress.services import UserCourseEnrollmentService


class Command(BaseCommand):
    help = "Mark mandatory course enrollments as OVERDUE when their deadline has passed."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Preview how many enrollments would be marked without making changes.",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        if dry_run:
            # Count without updating
            from django.utils import timezone
            from apps.learning_progress.models import UserCourseEnrollment
            from apps.learning_progress.constants import ProgressStatus

            today = timezone.now().date()
            extended = UserCourseEnrollment.objects.filter(
                course__is_mandatory=True,
                extended_due_date__lt=today,
                status__in=[ProgressStatus.NOT_STARTED, ProgressStatus.IN_PROGRESS],
            ).count()
            course_level = UserCourseEnrollment.objects.filter(
                course__is_mandatory=True,
                course__end_date__lt=today,
                extended_due_date__isnull=True,
                status__in=[ProgressStatus.NOT_STARTED, ProgressStatus.IN_PROGRESS],
            ).count()
            total = extended + course_level
            self.stdout.write(
                self.style.WARNING(
                    f"[DRY RUN] {total} enrollment(s) would be marked as OVERDUE."
                )
            )
            return

        count = UserCourseEnrollmentService().mark_overdue_enrollments()
        self.stdout.write(
            self.style.SUCCESS(f"Successfully marked {count} enrollment(s) as OVERDUE.")
        )
