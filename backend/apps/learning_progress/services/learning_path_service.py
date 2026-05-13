from common.services.base import BaseService
from django.utils import timezone
from django.db import transaction
from django.db.models import Count
from ..models import UserLessonProgress
from ..repositories import (
    LearningPathRepository,
    UserCourseEnrollmentRepository,
    UserLessonProgressRepository,
    UserContentProgressRepository,
    CourseCertificateRepository
)
from apps.assessment_engine.models import AssessmentMaster, AssessmentResult
from ..constants import ProgressStatus, EnrollmentType


class LearningPathService(BaseService):
    repository_class = LearningPathRepository


class UserCourseEnrollmentService(BaseService):
    repository_class = UserCourseEnrollmentRepository

    def enroll_employee_in_course(self, employee_id, course_id, enrollment_type=EnrollmentType.SELF_ENROLL):
        """
        Creates a new enrollment and initializes the progress hierarchy.
        """
        with transaction.atomic():
            enrollment = self.repository.create(**{
                "employee_id": employee_id,
                "course_id": course_id,
                "enrollment_type": enrollment_type,
                "status": ProgressStatus.NOT_STARTED,
                "progress_percentage": 0.00
            })
            return enrollment

    def can_access_course(self, enrollment) -> tuple[bool, str]:
        """
        Determines whether a learner can still access a course.

        Rules (soft lock):
        - Mandatory courses: always accessible, even after deadline.
        - Optional courses: locked once end_date has passed.
        - Completed enrollments: always accessible (certificate review etc.).

        Returns (allowed: bool, reason: str).
        """
        from django.utils import timezone

        # Completed learners always retain access
        if enrollment.status == ProgressStatus.COMPLETED:
            return True, ""

        course = enrollment.course
        due = enrollment.extended_due_date or course.end_date

        if due and timezone.now().date() > due:
            if course.is_mandatory:
                # Soft lock: still accessible but flag as overdue
                return True, "overdue"
            else:
                return False, "expired"

        return True, ""

    def mark_overdue_enrollments(self):
        """
        Bulk-marks mandatory enrollments as OVERDUE when their effective
        deadline has passed and they are not yet completed.

        Intended to be called from a scheduled task / management command.
        Returns the count of enrollments updated.
        """
        from django.utils import timezone
        from django.db.models import Q, F
        from ..models import UserCourseEnrollment

        today = timezone.now().date()

        # Enrollments where extended_due_date is set and has passed
        extended_overdue = UserCourseEnrollment.objects.filter(
            course__is_mandatory=True,
            extended_due_date__lt=today,
            status__in=[ProgressStatus.NOT_STARTED, ProgressStatus.IN_PROGRESS],
        )

        # Enrollments where course.end_date is set, no extended_due_date, and has passed
        course_overdue = UserCourseEnrollment.objects.filter(
            course__is_mandatory=True,
            course__end_date__lt=today,
            extended_due_date__isnull=True,
            status__in=[ProgressStatus.NOT_STARTED, ProgressStatus.IN_PROGRESS],
        )

        total = extended_overdue.update(status=ProgressStatus.OVERDUE)
        total += course_overdue.update(status=ProgressStatus.OVERDUE)
        return total

    def extend_due_date(self, enrollment_id, new_due_date):
        """
        Admin action: sets a per-learner extended_due_date.
        If the enrollment was OVERDUE, resets it to IN_PROGRESS so the
        learner can continue.
        """
        from ..models import UserCourseEnrollment
        enrollment = UserCourseEnrollment.objects.select_related("course").get(pk=enrollment_id)
        enrollment.extended_due_date = new_due_date
        fields = ["extended_due_date"]
        if enrollment.status == ProgressStatus.OVERDUE:
            enrollment.status = ProgressStatus.IN_PROGRESS
            fields.append("status")
        enrollment.save(update_fields=fields)
        return enrollment

    def update_course_progress(self, enrollment_id):
        """
        Recalculates progress, aware of required assessments.
        """
        enrollment = self.repository.get_by_id(enrollment_id)
        if not enrollment:
            return

        # 1. Lesson-based Progress
        total_lessons = enrollment.course.sections.all().aggregate(
            lesson_count=Count('lessons')
        )['lesson_count'] or 0
        
        if total_lessons == 0:
            return

        completed_lessons = enrollment.lesson_progress.filter(
            status=ProgressStatus.COMPLETED
        ).count()

        lesson_percentage = (completed_lessons / total_lessons * 100)

        # 2. Assessment Integrity Check
        required_assessments = AssessmentMaster.objects.filter(course=enrollment.course)
        pass_count = AssessmentResult.objects.filter(
            attempt__employee=enrollment.employee,
            attempt__assessment__in=required_assessments,
            status="PASS"
        ).values('attempt__assessment').distinct().count()

        all_assessments_passed = (pass_count >= required_assessments.count())

        # 3. Decision Logic
        if lesson_percentage >= 100 and all_assessments_passed:
            enrollment.progress_percentage = 100.00
            enrollment.status = ProgressStatus.COMPLETED
            enrollment.completed_at = timezone.now()
        else:
            percentage = min(lesson_percentage, 99.9) if not all_assessments_passed and lesson_percentage >= 100 else lesson_percentage
            enrollment.progress_percentage = percentage
            # Don't downgrade OVERDUE back to IN_PROGRESS here — overdue is set by the scheduler
            if enrollment.status not in (ProgressStatus.OVERDUE,):
                enrollment.status = ProgressStatus.IN_PROGRESS
            if not enrollment.started_at:
                enrollment.started_at = timezone.now()

        enrollment.save()
        return enrollment


class UserLessonProgressService(BaseService):
    repository_class = UserLessonProgressRepository


class UserContentProgressService(BaseService):
    repository_class = UserContentProgressRepository

    def record_heartbeat(self, enrollment_id, lesson_id, content_id, playhead):
        """
        Updates the playhead and marks content as 'completed' if requirements met.
        """
        with transaction.atomic():
            # 1. Ensure Lesson Progress exists
            # TODO: Implement caching for better performance
            enroll_service = UserCourseEnrollmentService()
            enrollment = enroll_service.repository.get_by_id(enrollment_id)
            
            lesson_progress, created = UserLessonProgress.objects.get_or_create(
                enrollment=enrollment,
                lesson_id=lesson_id,
                defaults={"status": ProgressStatus.IN_PROGRESS}
            )

            # 2. Update Content Progress
            content_progress, cp_created = self.repository.model.objects.get_or_create(
                lesson_progress=lesson_progress,
                content_id=content_id
            )
            content_progress.playhead_seconds = playhead
            
            # Simple logic: Moving playhead forward marks it as completed (stub for video logic)
            if playhead > 0:
                content_progress.is_completed = True
            
            content_progress.save()

            # 3. Check if all content in lesson is done
            total_content_in_lesson = lesson_progress.lesson.contents.count()
            completed_content_in_lesson = lesson_progress.content_progress.filter(is_completed=True).count()

            if completed_content_in_lesson >= total_content_in_lesson:
                if lesson_progress.status != ProgressStatus.COMPLETED:
                    lesson_progress.status = ProgressStatus.COMPLETED
                    lesson_progress.completed_at = timezone.now()
                    lesson_progress.save()
                    # Trigger Master Progress update
                    enroll_service.update_course_progress(enrollment_id)
            
            return content_progress

    def mark_content_completed(self, enrollment_id, content_id):
        """
        Explicitly marks a content record as finished (for PDFs/Documents).
        """
        with transaction.atomic():
            from apps.course_management.models import CourseContent
            content = CourseContent.objects.get(id=content_id)
            # Reuses heartbeat logic with a dummy '1' playhead
            return self.record_heartbeat(
                enrollment_id=enrollment_id,
                lesson_id=content.lesson_id,
                content_id=content_id,
                playhead=1
            )


class CourseCertificateService(BaseService):
    repository_class = CourseCertificateRepository
