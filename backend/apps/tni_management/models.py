from django.db import models
from apps.org_management.models import EmployeeMaster, JobRoleMaster, DepartmentMaster
from apps.skill_management.models import SkillMaster, SkillLevelMaster
from .constants import TNISourceType, TNIPriority, TNIStatus, TNIApprovalStatus


class TrainingNeed(models.Model):
    """
    Central entity storing identified training needs for employees.
    Needs can be identified via skill gap analysis, manager evaluation, etc.
    """
    employee = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="training_needs",
        help_text="Employee who requires training."
    )
    skill = models.ForeignKey(
        SkillMaster,
        on_delete=models.CASCADE,
        related_name="tni_entries",
        help_text="Specific skill required."
    )
    source_type = models.CharField(
        max_length=50,
        choices=TNISourceType.choices,
        default=TNISourceType.SKILL_GAP,
        help_text="Origin of the training need identification."
    )
    priority = models.CharField(
        max_length=50,
        choices=TNIPriority.choices,
        default=TNIPriority.MEDIUM
    )
    status = models.CharField(
        max_length=50,
        choices=TNIStatus.choices,
        default=TNIStatus.PENDING
    )
    notes = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Additional context regarding the identified need."
    )
    identified_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the need was first recorded."
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Soft-delete switch."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "tni_training_need"
        verbose_name = "Training Need"
        verbose_name_plural = "Training Needs"
        ordering = ["-identified_at"]
        indexes = [
            models.Index(fields=["employee"], name="idx_tni_need_employee_id"),
            models.Index(fields=["skill"], name="idx_tni_need_skill_id"),
            models.Index(fields=["status"], name="idx_tni_need_status"),
        ]

    def __str__(self):
        return f"{self.employee.employee_code} - {self.skill.skill_name} ({self.status})"


class SkillGapSnapshot(models.Model):
    """
    Stores detected skill gaps captured during automated gap analysis processing.
    """
    employee = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="skill_gap_snapshots"
    )
    skill = models.ForeignKey(
        SkillMaster,
        on_delete=models.CASCADE
    )
    required_level = models.ForeignKey(
        SkillLevelMaster,
        on_delete=models.PROTECT,
        related_name="gap_required_snapshots",
        help_text="The proficiency level required by the job role."
    )
    current_level = models.ForeignKey(
        SkillLevelMaster,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="gap_current_snapshots",
        help_text="The employee's proficiency level at the time of detection."
    )
    gap_value = models.IntegerField(
        help_text="Numerical difference between required and current level ranks."
    )
    detected_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "tni_skill_gap_snapshot"
        verbose_name = "Skill Gap Snapshot"
        verbose_name_plural = "Skill Gap Snapshots"
        indexes = [
            models.Index(fields=["employee"], name="idx_skill_gap_employee_id"),
            models.Index(fields=["skill"], name="idx_skill_gap_skill_id"),
        ]

    def __str__(self):
        return f"Gap: {self.employee.employee_code} - {self.skill.skill_name} (Gap: {self.gap_value})"


class ComplianceTrainingRequirement(models.Model):
    """
    Defines mandatory training courses for specific job roles based on compliance rules.
    """
    job_role = models.ForeignKey(
        JobRoleMaster,
        on_delete=models.CASCADE,
        related_name="compliance_requirements",
        help_text="Role the mandatory training applies to."
    )
    # CourseMaster is in Module 8. Using BigIntegerField placeholder for now.
    course_id = models.BigIntegerField(
        help_text="Foreign Key to future CourseMaster(id)."
    )
    mandatory = models.BooleanField(
        default=True,
        help_text="Whether this training is strictly required for compliance."
    )
    validity_days = models.IntegerField(
        help_text="Number of days before the certification/training expires."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "tni_compliance_training_requirement"
        verbose_name = "Compliance Training Requirement"
        verbose_name_plural = "Compliance Training Requirements"
        indexes = [
            models.Index(fields=["job_role"], name="idx_compliance_role_id"),
            models.Index(fields=["course_id"], name="idx_compliance_course_id"),
        ]

    def __str__(self):
        return f"{self.job_role.job_role_name} - Course ID {self.course_id}"


class TrainingNeedApproval(models.Model):
    """
    Handles the multi-step approval workflow for identified training needs.
    """
    training_need = models.ForeignKey(
        TrainingNeed,
        on_delete=models.CASCADE,
        related_name="approvals"
    )
    approver = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="made_tni_approvals"
    )
    approval_status = models.CharField(
        max_length=50,
        choices=TNIApprovalStatus.choices,
        default=TNIApprovalStatus.PENDING
    )
    comments = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Remarks by the approver."
    )
    approved_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the action was finalized."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tni_training_need_approval"
        verbose_name = "Training Need Approval"
        verbose_name_plural = "Training Need Approvals"
        indexes = [
            models.Index(fields=["training_need"], name="idx_tni_approval_need_id"),
            models.Index(fields=["approver"], name="idx_tni_approval_approver_id"),
        ]

    def __str__(self):
        return f"Approval for {self.training_need} by {self.approver.employee_code}"


class TrainingNeedCourseRecommendation(models.Model):
    """
    Maps specific courses to identified training needs based on skill alignment.
    """
    training_need = models.ForeignKey(
        TrainingNeed,
        on_delete=models.CASCADE,
        related_name="course_recommendations"
    )
    # CourseMaster is in Other Module. Using BigIntegerField placeholder for now.
    course_id = models.BigIntegerField(
        help_text="Reference to future CourseMaster(id)."
    )
    recommendation_reason = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Why this course was chosen to address the need."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tni_training_need_course_recommendation"
        verbose_name = "TNI Course Recommendation"
        verbose_name_plural = "TNI Course Recommendations"
        indexes = [
            models.Index(fields=["training_need"], name="idx_tni_course_need_id"),
            models.Index(fields=["course_id"], name="idx_tni_course_course_id"),
        ]

    def __str__(self):
        return f"Recommendation: {self.training_need} -> Course {self.course_id}"


class TNIAggregatedAnalysis(models.Model):
    """
    Operational data used for reporting dashboards to track organizational skill gaps.
    Note: (NP) semi-persistent data for analytics performance.
    """
    department = models.ForeignKey(
        DepartmentMaster,
        on_delete=models.CASCADE,
        related_name="tni_analytics"
    )
    total_training_needs = models.IntegerField(default=0)
    high_priority_needs = models.IntegerField(default=0)
    generated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "tni_aggregated_analysis"
        verbose_name = "TNI Aggregated Analysis"
        verbose_name_plural = "TNI Aggregated Analyses"
        ordering = ["-generated_at"]
        indexes = [
            models.Index(fields=["department"], name="idx_tni_analysis_dept_id"),
        ]

    def __str__(self):
        return f"Analytics for {self.department.department_name} on {self.generated_at}"
