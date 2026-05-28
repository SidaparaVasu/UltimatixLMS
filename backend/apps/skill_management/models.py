from django.db import models
from apps.org_management.models import JobRoleMaster, EmployeeMaster


# ---------------------------------------------------------------------------
# Choices
# ---------------------------------------------------------------------------

class SkillIdentifiedBy(models.TextChoices):
    SELF       = "SELF",       "Self"
    MANAGER    = "MANAGER",    "Manager"
    SYSTEM     = "SYSTEM",     "System"
    ASSESSMENT = "ASSESSMENT", "Assessment"


class SkillRatingType(models.TextChoices):
    SELF    = "SELF",    "Self"
    MANAGER = "MANAGER", "Manager"


class SkillRatingStatus(models.TextChoices):
    DRAFT     = "DRAFT",     "Draft"
    SUBMITTED = "SUBMITTED", "Submitted"


class SkillCategoryMaster(models.Model):
    """
    Stores high-level skill categories used for organizing skills.
    e.g. Technical, Soft Skills, Leadership.
    """
    category_name = models.CharField(
        max_length=100,
        help_text="Name of the skill category."
    )
    category_code = models.CharField(
        max_length=50,
        unique=True,
        db_index=True,
        help_text="Unique short code for the category."
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        default=""
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Soft-delete switch."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "skill_category_master"
        verbose_name = "Skill Category"
        verbose_name_plural = "Skill Categories"
        ordering = ["category_name"]

    def __str__(self):
        return f"{self.category_name} ({self.category_code})"


class SkillMaster(models.Model):
    """
    Stores individual skills and supports hierarchical relationships.
    e.g. Programming -> Python -> Advanced Python
    """
    skill_name = models.CharField(
        max_length=150,
        help_text="Name of the skill."
    )
    skill_code = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        help_text="Unique identifier for the skill."
    )
    parent_skill = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="child_skills",
        help_text="Parent skill for hierarchical structure."
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        default=""
    )
    is_active = models.BooleanField(
        default=True,
        help_text="Soft-delete switch."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "skill_master"
        verbose_name = "Skill"
        verbose_name_plural = "Skills"
        ordering = ["skill_name"]

    def __str__(self):
        return f"{self.skill_name} ({self.skill_code})"


class SkillCategorySkillMap(models.Model):
    """
    Maps skills to categories allowing a skill to belong to multiple categories.
    """
    skill = models.ForeignKey(
        SkillMaster,
        on_delete=models.CASCADE,
        related_name="category_mappings"
    )
    category = models.ForeignKey(
        SkillCategoryMaster,
        on_delete=models.CASCADE,
        related_name="skill_mappings"
    )
    is_active = models.BooleanField(
        default=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "skill_category_skill_map"
        unique_together = ["skill", "category"]
        verbose_name = "Skill-Category Mapping"
        verbose_name_plural = "Skill-Category Mappings"

    def __str__(self):
        return f"{self.skill.skill_name} -> {self.category.category_name}"


class SkillLevelMaster(models.Model):
    """
    Stores skill proficiency levels (e.g. Basic, Intermediate, Advanced).
    """
    level_name = models.CharField(
        max_length=50,
        help_text="Display name for the proficiency level."
    )
    level_rank = models.PositiveSmallIntegerField(
        help_text="Numeric rank used for skill gap analysis calculations (e.g. 1-5)."
    )
    description = models.CharField(
        max_length=255,
        blank=True,
        default=""
    )
    is_active = models.BooleanField(
        default=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "skill_level_master"
        verbose_name = "Skill Level"
        verbose_name_plural = "Skill Levels"
        ordering = ["level_rank"]
        indexes = [
             models.Index(fields=["level_rank"], name="idx_skill_level_rank"),
        ]

    def __str__(self):
        return f"Level {self.level_rank}: {self.level_name}"


class JobRoleSkillRequirement(models.Model):
    """
    Defines the required skills and minimum proficiency levels for each job role.
    This creates the "ideal" competency matrix for the organization.
    """
    job_role = models.ForeignKey(
        JobRoleMaster,
        on_delete=models.CASCADE,
        related_name="skill_requirements",
        help_text="Role being assigned the skill requirement."
    )
    skill = models.ForeignKey(
        SkillMaster,
        on_delete=models.CASCADE,
        related_name="role_requirements"
    )
    required_level = models.ForeignKey(
        SkillLevelMaster,
        on_delete=models.PROTECT,
        help_text="Minimum proficiency level required for this role."
    )
    is_active = models.BooleanField(
        default=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "job_role_skill_requirement"
        unique_together = ["job_role", "skill"]
        verbose_name = "Job Role Skill Requirement"
        verbose_name_plural = "Job Role Skill Requirements"

    def __str__(self):
        return f"{self.job_role.job_role_name} -> {self.skill.skill_name} ({self.required_level.level_name})"


class EmployeeSkill(models.Model):
    """
    Stores the current finalized skill proficiency level for an employee.
    This is the authoritative record — updated whenever a manager submits
    their rating or the assessment engine produces a result.
    """
    employee = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="skills"
    )
    skill = models.ForeignKey(
        SkillMaster,
        on_delete=models.CASCADE,
        related_name="employee_owners"
    )
    current_level = models.ForeignKey(
        SkillLevelMaster,
        on_delete=models.PROTECT
    )
    identified_by = models.CharField(
        max_length=20,
        choices=SkillIdentifiedBy.choices,
        default=SkillIdentifiedBy.SELF,
        help_text="Who last set the current proficiency level."
    )
    is_active = models.BooleanField(
        default=True
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "employee_skill"
        unique_together = ["employee", "skill"]
        verbose_name = "Employee Skill"
        verbose_name_plural = "Employee Skills"

    def __str__(self):
        return f"{self.employee.employee_code} -> {self.skill.skill_name} ({self.current_level.level_name})"


class EmployeeSkillHistory(models.Model):
    """
    Stores historical changes in employee skill levels for audit and progression tracking.

    Written automatically by the post_save signal on EmployeeSkill whenever
    current_level changes. Callers can attach context by setting these attributes
    on the EmployeeSkill instance before saving:
        instance._changed_by     = EmployeeMaster | None
        instance._change_reason  = one of SkillChangeReason choices
    """

    class ChangeReason(models.TextChoices):
        SELF_RATING          = "SELF_RATING",          "Self Rating"
        MANAGER_RATING       = "MANAGER_RATING",       "Manager Rating"
        ASSESSMENT_AUTO      = "ASSESSMENT_AUTO",      "Assessment — Auto Assigned"
        ASSESSMENT_APPROVED  = "ASSESSMENT_APPROVED",  "Assessment — Approved"
        ADMIN_OVERRIDE       = "ADMIN_OVERRIDE",       "Admin Override"

    employee = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="skill_history"
    )
    skill = models.ForeignKey(
        SkillMaster,
        on_delete=models.CASCADE
    )
    old_level = models.ForeignKey(
        SkillLevelMaster,
        on_delete=models.SET_NULL,
        null=True,
        related_name="old_history"
    )
    new_level = models.ForeignKey(
        SkillLevelMaster,
        on_delete=models.SET_NULL,
        null=True,
        related_name="new_history"
    )
    changed_by = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="skill_changes_made",
        help_text="Employee who triggered the change. Null means system/auto."
    )
    change_reason = models.CharField(
        max_length=30,
        choices=ChangeReason.choices,
        default=ChangeReason.ADMIN_OVERRIDE,
        help_text="Why the skill level changed."
    )
    remarks = models.CharField(
        max_length=255,
        blank=True,
        default=""
    )
    changed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employee_skill_history"
        verbose_name = "Employee Skill History"
        verbose_name_plural = "Employee Skill Histories"
        ordering = ["-changed_at"]

    def __str__(self):
        return f"{self.employee.employee_code} - {self.skill.skill_name} changed on {self.changed_at}"


class EmployeeSkillAssessment(models.Model):
    """
    Stores results of skill-based assessments for employees.
    Acts as a foundation hook for the future Assessment Engine.
    """
    employee = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="skill_assessments"
    )
    skill = models.ForeignKey(
        SkillMaster,
        on_delete=models.CASCADE
    )
    # Using BigIntegerField temporarily until AssessmentMaster is created
    assessment_id = models.BigIntegerField(
        help_text="Reference to future AssessmentMaster ID."
    )
    score = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Score achieved in the assessment."
    )
    result_level = models.ForeignKey(
        SkillLevelMaster,
        on_delete=models.PROTECT,
        help_text="Skill proficiency level awarded based on the score."
    )
    assessed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "employee_skill_assessment"
        verbose_name = "Employee Skill Assessment"
        verbose_name_plural = "Employee Skill Assessments"
        ordering = ["-assessed_at"]

    def __str__(self):
        return f"{self.employee.employee_code} - {self.skill.skill_name} Score: {self.score}"



class EmployeeSkillRating(models.Model):
    """
    Staging model for the TNI rating cycle.

    Holds one active row per [employee, skill, rating_type] — the current
    in-progress or submitted rating for the ongoing cycle.

    History is preserved automatically via the post_save signal which writes
    every change to EmployeeSkillRatingHistory before the row is overwritten.

    Cycle reset: instead of overwriting, a new TNI cycle or re-assessment
    freezes the old row (is_latest=False) and creates a new one. The signal
    still fires to maintain append-only history.
    """
    employee = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="skill_ratings"
    )
    skill = models.ForeignKey(
        SkillMaster,
        on_delete=models.CASCADE,
        related_name="employee_ratings"
    )
    rated_by = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="given_skill_ratings",
        help_text="The person who performed the rating (employee for SELF, manager for MANAGER)."
    )
    rating_type = models.CharField(
        max_length=10,
        choices=SkillRatingType.choices,
        help_text="Whether this is a self-rating or a manager-identified rating."
    )
    rated_level = models.ForeignKey(
        SkillLevelMaster,
        on_delete=models.PROTECT,
        help_text="The proficiency level assigned in this rating."
    )
    status = models.CharField(
        max_length=10,
        choices=SkillRatingStatus.choices,
        default=SkillRatingStatus.DRAFT
    )
    submitted_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Timestamp when the rating was submitted. Null while in DRAFT."
    )
    # SELF-type fields
    observations = models.TextField(
        blank=True,
        default="",
        help_text="Observed performance hindrances (used for SELF ratings)."
    )
    accomplishments = models.TextField(
        blank=True,
        default="",
        help_text="Recent accomplishments (used for SELF ratings)."
    )
    # MANAGER-type fields
    notes = models.CharField(
        max_length=500,
        blank=True,
        default="",
        help_text="Reviewer notes (used for MANAGER ratings)."
    )
    is_latest = models.BooleanField(
        default=True,
        help_text="True if this is the most recent rating for this employee/skill/type."
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "employee_skill_rating"
        verbose_name = "Employee Skill Rating"
        verbose_name_plural = "Employee Skill Ratings"
        ordering = ["-updated_at"]
        indexes = [
            models.Index(fields=["employee"], name="idx_skill_rating_employee_id"),
            models.Index(fields=["skill"],    name="idx_skill_rating_skill_id"),
            models.Index(fields=["status"],   name="idx_skill_rating_status"),
            models.Index(fields=["is_latest"],name="idx_skill_rating_is_latest"),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=["employee", "skill", "rating_type"],
                condition=models.Q(is_latest=True),
                name="unique_latest_skill_rating"
            )
        ]

    def __str__(self):
        return (
            f"{self.employee.employee_code} - {self.skill.skill_name} "
            f"[{self.rating_type}] ({self.status})"
        )


class EmployeeSkillRatingHistory(models.Model):
    """
    Append-only audit log for EmployeeSkillRating changes.

    Written automatically by the post_save signal on EmployeeSkillRating
    every time a row is created or updated (level change, status change,
    notes update). Never modified after creation.

    Answers historical queries such as:
      - "What did John self-rate Python in April 2026?"
      - "What did his manager identify in October 2026?"
    """
    employee = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="skill_rating_history"
    )
    skill = models.ForeignKey(
        SkillMaster,
        on_delete=models.CASCADE,
        related_name="rating_history"
    )
    rating_type = models.CharField(
        max_length=10,
        choices=SkillRatingType.choices
    )
    rated_by = models.ForeignKey(
        EmployeeMaster,
        on_delete=models.CASCADE,
        related_name="given_rating_history"
    )
    old_level = models.ForeignKey(
        SkillLevelMaster,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="rating_old_history",
        help_text="Level before this change. Null on first creation."
    )
    new_level = models.ForeignKey(
        SkillLevelMaster,
        on_delete=models.SET_NULL,
        null=True,
        related_name="rating_new_history",
        help_text="Level after this change."
    )
    old_status = models.CharField(
        max_length=10,
        blank=True,
        default="",
        help_text="Status before this change."
    )
    new_status = models.CharField(
        max_length=10,
        help_text="Status after this change."
    )
    notes_snapshot = models.CharField(
        max_length=500,
        blank=True,
        default="",
        help_text="Snapshot of notes/observations at the time of this change."
    )
    changed_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when this history entry was recorded."
    )

    class Meta:
        db_table = "employee_skill_rating_history"
        verbose_name = "Employee Skill Rating History"
        verbose_name_plural = "Employee Skill Rating Histories"
        ordering = ["-changed_at"]
        indexes = [
            models.Index(fields=["employee"],    name="idx_skill_rating_hist_emp"),
            models.Index(fields=["skill"],       name="idx_skill_rating_hist_skill"),
            models.Index(fields=["rating_type"], name="idx_skill_rating_hist_type"),
            models.Index(fields=["changed_at"],  name="idx_skill_rating_hist_date"),
        ]

    def __str__(self):
        return (
            f"{self.employee.employee_code} - {self.skill.skill_name} "
            f"[{self.rating_type}] changed at {self.changed_at}"
        )
