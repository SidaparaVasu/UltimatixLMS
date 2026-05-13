from django.db import models
from apps.org_management.models import EmployeeMaster
from apps.course_management.models import CourseMaster, CourseSection, CourseLesson, CourseContent
from .constants import ProgressStatus, EnrollmentType


class LearningPathMaster(models.Model):
    """
    Curated sequence of courses for specific roles or competencies.
    """
    path_name = models.CharField(max_length=200)
    path_code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "lp_master"
        verbose_name = "Learning Path"
        verbose_name_plural = "Learning Paths"

    def __str__(self):
        return self.path_name


class LearningPathCourseMap(models.Model):
    """
    Sequenced courses within a learning path.
    """
    path = models.ForeignKey(LearningPathMaster, on_delete=models.CASCADE, related_name="courses")
    course = models.ForeignKey(CourseMaster, on_delete=models.CASCADE)
    display_order = models.PositiveIntegerField(default=1)
    is_mandatory = models.BooleanField(default=True)

    class Meta:
        db_table = "lp_course_map"
        ordering = ["display_order"]
        unique_together = ["path", "course"]


class UserCourseEnrollment(models.Model):
    """
    The entry point of a student into a course learning journey.
    """
    employee = models.ForeignKey(EmployeeMaster, on_delete=models.CASCADE, related_name="course_enrollments")
    course = models.ForeignKey(CourseMaster, on_delete=models.PROTECT, related_name="user_enrollments")
    enrollment_type = models.CharField(
        max_length=50,
        choices=EnrollmentType.choices,
        default=EnrollmentType.SELF_ENROLL
    )
    status = models.CharField(
        max_length=50,
        choices=ProgressStatus.choices,
        default=ProgressStatus.NOT_STARTED
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    progress_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    # Allows tracking which course in which path
    learning_path = models.ForeignKey(
        LearningPathMaster, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    extended_due_date = models.DateField(
        null=True,
        blank=True,
        help_text=(
            "Admin-set per-learner deadline override. "
            "When set, this takes precedence over course.end_date for overdue calculations."
        ),
    )

    class Meta:
        db_table = "lp_user_course_enrollment"
        unique_together = ["employee", "course", "learning_path"]
        indexes = [
            models.Index(fields=["employee", "status"], name="idx_lp_enroll_emp_status"),
        ]

    def __str__(self):
        return f"{self.employee.employee_code} -> {self.course.course_code}"


class UserLessonProgress(models.Model):
    """
    Tracks completion status for individual lessons.
    """
    enrollment = models.ForeignKey(UserCourseEnrollment, on_delete=models.CASCADE, related_name="lesson_progress")
    lesson = models.ForeignKey(CourseLesson, on_delete=models.PROTECT)
    status = models.CharField(
        max_length=50,
        choices=ProgressStatus.choices,
        default=ProgressStatus.NOT_STARTED
    )
    completed_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "lp_user_lesson_progress"
        unique_together = ["enrollment", "lesson"]


class UserContentProgress(models.Model):
    """
    Granular asset tracking (Heartbeat recording).
    """
    lesson_progress = models.ForeignKey(UserLessonProgress, on_delete=models.CASCADE, related_name="content_progress")
    content = models.ForeignKey(CourseContent, on_delete=models.PROTECT)
    playhead_seconds = models.PositiveIntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    last_accessed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "lp_user_content_progress"
        unique_together = ["lesson_progress", "content"]


class CourseCertificate(models.Model):
    """
    Auto-generated proof of competency.
    """
    enrollment = models.OneToOneField(UserCourseEnrollment, on_delete=models.CASCADE, related_name="certificate")
    certificate_number = models.CharField(max_length=100, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)
    expiry_date = models.DateField(null=True, blank=True)
    # Could link to a PDF URL if using external storage
    verification_code = models.CharField(max_length=50, unique=True)

    class Meta:
        db_table = "lp_course_certificate"
        verbose_name = "Certificate"
        verbose_name_plural = "Certificates"
