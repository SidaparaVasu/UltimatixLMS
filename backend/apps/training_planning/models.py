from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.org_management.models import EmployeeMaster, DepartmentMaster
from .constants import (
    TrainingPlanStatus, TrainingPlanPriority, TrainingApprovalStatus,
    TrainingSessionType, EnrollmentStatus, AttendanceStatus
)
from apps.course_management.models import CourseMaster
from common.methods import current_year

class TrainingPlan(models.Model):
    """
    Defines high-level training strategies, typically for an annual cycle.
    """
    plan_name = models.CharField(
        max_length=255,
        help_text="Title of the training plan."
    )
    year = models.PositiveIntegerField(
        default=current_year,
        validators=[
            MinValueValidator(2000), 
            MaxValueValidator(2100)
        ],
        help_text="Training Plan year (YYYY format)."
    )
    department = models.ForeignKey(
        DepartmentMaster,
        on_delete=models.CASCADE,
        related_name="training_plans"
    )
    created_by = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="created_plans"
    )
    status = models.CharField(
        max_length=50,
        choices=TrainingPlanStatus.choices,
        default=TrainingPlanStatus.DRAFT
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tp_training_plan"
        verbose_name = "Training Plan"
        verbose_name_plural = "Training Plans"
        ordering = ["-year", "plan_name"]
        indexes = [
            models.Index(fields=["department"], name="idx_tp_plan_dept_id"),
            models.Index(fields=["year"], name="idx_tp_plan_year"),
        ]

    def __str__(self):
        return f"{self.plan_name} ({self.year})"


class TrainingPlanItem(models.Model):
    """
    Individual training records within a training plan.
    """
    training_plan = models.ForeignKey(
        TrainingPlan,
        on_delete=models.CASCADE,
        related_name="items"
    )
    course = models.ForeignKey(
        CourseMaster,
        on_delete=models.PROTECT,
        related_name="plan_items",
        null=True,
        blank=True
    )
    target_department = models.ForeignKey(
        DepartmentMaster,
        on_delete=models.CASCADE,
        related_name="targeted_plan_items"
    )
    planned_participants = models.IntegerField(default=0)
    priority = models.CharField(
        max_length=50,
        choices=TrainingPlanPriority.choices,
        default=TrainingPlanPriority.MEDIUM
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tp_training_plan_item"
        verbose_name = "Training Plan Item"
        verbose_name_plural = "Training Plan Items"
        indexes = [
            models.Index(fields=["training_plan"], name="idx_tp_item_plan_id"),
            models.Index(fields=["course"], name="idx_tp_item_course_fk"),
        ]

    def __str__(self):
        return f"{self.training_plan.plan_name} - {self.course.course_title}"


class TrainingPlanApproval(models.Model):
    """
    Handles workflow approvals for high-level training plans.
    """
    training_plan = models.ForeignKey(
        TrainingPlan,
        on_delete=models.CASCADE,
        related_name="approvals"
    )
    approver = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="plan_approvals"
    )
    approval_status = models.CharField(
        max_length=50,
        choices=TrainingApprovalStatus.choices,
        default=TrainingApprovalStatus.PENDING
    )
    comments = models.CharField(
        max_length=255,
        blank=True,
        default=""
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tp_training_plan_approval"
        verbose_name = "Training Plan Approval"
        verbose_name_plural = "Training Plan Approvals"
        indexes = [
            models.Index(fields=["training_plan"], name="idx_tp_approval_plan_id"),
            models.Index(fields=["approver"], name="idx_tp_approval_approver_id"),
        ]


class TrainingCalendar(models.Model):
    """
    Represents the annual structural container for training events.
    """
    year = models.PositiveIntegerField(
        default=current_year,
        validators=[
            MinValueValidator(2000), 
            MaxValueValidator(2100)
        ],
        help_text="Training Calendar year (YYYY format)."
    )
    department = models.ForeignKey(
        DepartmentMaster,
        on_delete=models.CASCADE,
        related_name="training_calendars"
    )
    created_by = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tp_training_calendar"
        verbose_name = "Training Calendar"
        verbose_name_plural = "Training Calendars"
        unique_together = ["year", "department"]
        indexes = [
            models.Index(fields=["year"], name="idx_tp_calendar_year"),
        ]

    def __str__(self):
        return f"Calendar {self.year} - {self.department.department_name}"


class TrainingSession(models.Model):
    """
    Represents actual scheduled training events (batches) for a course.
    """
    course = models.ForeignKey(
        CourseMaster,
        on_delete=models.PROTECT,
        related_name="sessions",
        null=True,
        blank=True
    )
    calendar = models.ForeignKey(
        TrainingCalendar,
        on_delete=models.CASCADE,
        related_name="sessions"
    )
    session_title = models.CharField(
        max_length=255,
        help_text="Batch name (e.g. Batch 1, Special Workshop)."
    )
    session_type = models.CharField(
        max_length=50,
        choices=TrainingSessionType.choices,
        default=TrainingSessionType.ONLINE
    )
    session_start_date = models.DateTimeField()
    session_end_date = models.DateTimeField()
    location = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Physical room or venue."
    )
    meeting_link = models.URLField(
        max_length=500,
        blank=True,
        default="",
        help_text="Zoom/Teams/Meet link for Online sessions."
    )
    capacity = models.IntegerField(default=30)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tp_training_session"
        verbose_name = "Training Session"
        verbose_name_plural = "Training Sessions"
        ordering = ["session_start_date"]
        indexes = [
            models.Index(fields=["course"], name="idx_tp_session_course_fk"),
            models.Index(fields=["calendar"], name="idx_tp_session_cal_id"),
            models.Index(fields=["session_start_date"], name="idx_tp_session_start"),
        ]

    def __str__(self):
        return f"{self.session_title} ({self.session_start_date.date()})"


class TrainingSessionTrainer(models.Model):
    """
    Maps trainers (internal employees or potentially external) to sessions.
    """
    training_session = models.ForeignKey(
        TrainingSession,
        on_delete=models.CASCADE,
        related_name="trainers"
    )
    trainer = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="assigned_sessions"
    )
    assigned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tp_training_session_trainer"
        verbose_name = "Session Trainer"
        verbose_name_plural = "Session Trainers"
        unique_together = ["training_session", "trainer"]


class TrainingSessionEnrollment(models.Model):
    """
    Tracks which employees have signed up for a specific session.
    """
    training_session = models.ForeignKey(
        TrainingSession,
        on_delete=models.CASCADE,
        related_name="enrollments"
    )
    employee = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="session_enrollments"
    )
    enrollment_status = models.CharField(
        max_length=50,
        choices=EnrollmentStatus.choices,
        default=EnrollmentStatus.ENROLLED
    )
    enrolled_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tp_training_session_enrollment"
        verbose_name = "Session Enrollment"
        verbose_name_plural = "Session Enrollments"
        unique_together = ["training_session", "employee"]
        indexes = [
            models.Index(fields=["training_session"], name="idx_tp_enroll_session_id"),
            models.Index(fields=["employee"], name="idx_tp_enroll_emp_id"),
        ]


class TrainingAttendance(models.Model):
    """
    Persistence for attendance tracking after session execution.
    """
    training_session = models.ForeignKey(
        TrainingSession,
        on_delete=models.CASCADE,
        related_name="attendance_records"
    )
    employee = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="attendance_logs"
    )
    attendance_status = models.CharField(
        max_length=50,
        choices=AttendanceStatus.choices,
        default=AttendanceStatus.PRESENT
    )
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tp_training_attendance"
        verbose_name = "Training Attendance"
        verbose_name_plural = "Training Attendance Logs"
        unique_together = ["training_session", "employee"]
        indexes = [
            models.Index(fields=["training_session"], name="idx_tp_attn_session_id"),
            models.Index(fields=["employee"], name="idx_tp_attn_emp_id"),
        ]
