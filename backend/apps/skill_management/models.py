from django.db import models
from apps.org_management.models import JobRoleMaster, EmployeeMaster


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
    Stores current actual skill proficiency levels for employees.
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
    """
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


class CourseSkillMapping(models.Model):
    """
    Maps courses to skills for targeted learning recommendations.
    Acts as a foundation hook for the future Course Management module.
    """
    # Using BigIntegerField temporarily until CourseMaster is created
    course_id = models.BigIntegerField(
        help_text="Reference to future CourseMaster ID."
    )
    skill = models.ForeignKey(
        SkillMaster,
        on_delete=models.CASCADE,
        related_name="course_mappings"
    )
    target_level = models.ForeignKey(
        SkillLevelMaster,
        on_delete=models.PROTECT,
        help_text="The proficiency level expected after completing this course."
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "course_skill_mapping"
        unique_together = ["course_id", "skill"]
        verbose_name = "Course Skill Mapping"
        verbose_name_plural = "Course Skill Mappings"

    def __str__(self):
        return f"Course ID {self.course_id} targets {self.skill.skill_name} ({self.target_level.level_name})"
