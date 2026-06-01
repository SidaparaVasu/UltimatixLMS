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


class UserSCORMProgress(models.Model):
    """
    Persists the SCORM data model for a learner × content pair.

    Kept separate from UserContentProgress because:
    - suspend_data can be up to 64KB (doesn't belong in a generic progress record)
    - SCORM declares its own completion via lesson_status — we must trust it, not infer it
    - Full variable snapshots (scorm_variables) are needed for audit and diagnostics
    - attempt_count allows clean retake handling without touching prior progress records
    """
    enrollment = models.ForeignKey(
        UserCourseEnrollment,
        on_delete=models.CASCADE,
        related_name='scorm_progress',
    )
    content = models.ForeignKey(
        'course_management.CourseContent',
        on_delete=models.PROTECT,
        related_name='scorm_progress',
    )
    lesson = models.ForeignKey(
        'course_management.CourseLesson',
        on_delete=models.PROTECT,
        related_name='scorm_lesson_progress',
    )

    # --- Core SCORM fields (cached from raw variables for fast reporting) ---

    # SCORM 1.2:   cmi.core.lesson_status
    # SCORM 2004:  cmi.completion_status
    # Values: 'not attempted' | 'incomplete' | 'completed' | 'passed' | 'failed' | 'browsed'
    lesson_status = models.CharField(max_length=20, default='not attempted')

    # SCORM 2004 only: cmi.success_status  → 'passed' | 'failed' | 'unknown'
    success_status = models.CharField(max_length=10, blank=True, default='')

    # Bookmark so the course can resume to the right slide/page on next launch
    # SCORM 1.2: cmi.core.lesson_location  |  SCORM 2004: cmi.location
    lesson_location = models.CharField(max_length=255, blank=True, default='')

    # Score fields
    # SCORM 1.2: cmi.core.score.*  |  SCORM 2004: cmi.score.*
    score_raw    = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    score_max    = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    score_min    = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    # SCORM 2004 only: cmi.score.scaled (range -1.0 to 1.0)
    score_scaled = models.DecimalField(max_digits=5, decimal_places=4, null=True, blank=True)

    # Total accumulated session time (seconds)
    total_time_seconds = models.PositiveIntegerField(default=0)

    # --- Resume data ---
    # cmi.suspend_data — opaque string the course writes to resume its internal state
    # SCORM 1.2 spec limit: 4,096 chars  |  SCORM 2004 (3rd/4th): 64,000 chars
    # We store up to 65,536 — backend truncates with a warning if exceeded
    suspend_data = models.TextField(blank=True, default='')

    # --- Full variable snapshot for audit/diagnostics ---
    # Raw key→value dict from the last Commit() call.
    # Do NOT query on this; use the cached fields above for reporting.
    scorm_variables = models.JSONField(default=dict)

    # --- Attempt tracking ---
    # Incremented when a learner retakes the course so prior state is cleared
    attempt_count = models.PositiveIntegerField(default=1)

    last_accessed_at  = models.DateTimeField(auto_now=True)
    first_accessed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lp_user_scorm_progress'
        unique_together = ['enrollment', 'content']
        indexes = [
            models.Index(fields=['enrollment', 'content'], name='idx_scorm_enroll_content'),
        ]
        verbose_name = 'User SCORM Progress'
        verbose_name_plural = 'User SCORM Progress Records'

    def __str__(self):
        return (
            f"{self.enrollment.employee.employee_code} → "
            f"content:{self.content_id} ({self.lesson_status})"
        )

    def is_complete(self) -> bool:
        """
        Returns True when the SCORM package has declared this SCO finished.
        Trust the package's status — don't try to infer completion from other signals.
        """
        return self.lesson_status in ('completed', 'passed')

