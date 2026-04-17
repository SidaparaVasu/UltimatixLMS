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
            # 1. Create Enrollment
            enrollment = self.repository.create(**{
                "employee_id": employee_id,
                "course_id": course_id,
                "enrollment_type": enrollment_type,
                "status": ProgressStatus.NOT_STARTED,
                "progress_percentage": 0.00
            })
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
            # Cap progress at 99.9% if lessons are done but assessment is missing/failed
            percentage = min(lesson_percentage, 99.9) if not all_assessments_passed and lesson_percentage >= 100 else lesson_percentage
            enrollment.progress_percentage = percentage
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
