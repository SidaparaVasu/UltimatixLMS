import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from .constants import QuestionType, AssessmentStatus, GradingStatus, QuestionSelectionMode, SkillUpgradeStatus
from apps.course_management.models import CourseMaster, CourseLesson


class AssessmentMaster(models.Model):
    """
    Main container for an exam or quiz.
    Stores high-level configuration and grading rules.
    """
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default="")
    course = models.ForeignKey(
        CourseMaster,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assessments",
        help_text="Optional: link to a course. Leave blank for standalone assessments."
    )
    # Optional: Link directly to a lesson if it's a mid-module quiz
    lesson = models.ForeignKey(
        CourseLesson,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quizzes"
    )

    # ── Question selection ────────────────────────────────────────────────────
    question_selection_mode = models.CharField(
        max_length=20,
        choices=QuestionSelectionMode.choices,
        default=QuestionSelectionMode.FIXED,
        help_text=(
            "FIXED: questions are pre-mapped at creation time (course quizzes). "
            "DYNAMIC: questions are selected from the bank at attempt start (standalone)."
        )
    )
    number_of_questions = models.PositiveIntegerField(
        default=10,
        help_text="For DYNAMIC mode: how many questions to pick per attempt from the bank."
    )

    duration_minutes = models.PositiveIntegerField(
        default=30, 
        help_text="Time limit in minutes."
    )
    passing_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=50.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    retake_limit = models.PositiveIntegerField(
        default=1, 
        help_text="Number of times a student can attempt this quiz."
    )
    retake_cooldown_hours = models.PositiveIntegerField(
        default=0,
        help_text=(
            "Hours a learner must wait after a FAILED attempt before retaking. "
            "0 = no cooldown. Only applies to standalone (DYNAMIC) assessments."
        )
    )

    is_randomized = models.BooleanField(
        default=False, 
        help_text="If true, question order will be shuffled for each student."
    )
    negative_marking_enabled = models.BooleanField(
        default=False,
        help_text="If enabled, incorrect answers will deduct points based on the percentage below."
    )
    negative_marking_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text="Percentage of question weight to deduct for wrong answers."
    )
    
    status = models.CharField(
        max_length=50,
        choices=AssessmentStatus.choices,
        default=AssessmentStatus.DRAFT
    )
    certificate_validity_days = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(3650)],
        help_text=(
            "Days after passing before the certificate expires. "
            "Null = lifetime validity (no expiry date on the certificate)."
        ),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "asmt_master"
        verbose_name = "Assessment"
        verbose_name_plural = "Assessments"

    def __str__(self):
        return self.title

    @property
    def is_standalone(self) -> bool:
        """True when this assessment is not linked to any course."""
        return self.course_id is None and self.lesson_id is None


class QuestionBank(models.Model):
    """
    Stores individual questions that can be mapped to multiple assessments.

    For standalone (DYNAMIC) assessments, each question is linked to a skill
    and a skill level so the selection algorithm can filter by target proficiency.
    Course quiz questions (FIXED mode) may leave skill/skill_level blank.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question_text = models.TextField()
    question_type = models.CharField(
        max_length=50,
        choices=QuestionType.choices,
        default=QuestionType.MCQ
    )

    # ── Skill linkage (for dynamic question selection) ────────────────────────
    skill = models.ForeignKey(
        "skill_management.SkillMaster",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="questions",
        help_text="Skill this question tests. Required for DYNAMIC assessments."
    )
    skill_level = models.ForeignKey(
        "skill_management.SkillLevelMaster",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="questions",
        help_text="Minimum skill level this question targets."
    )

    # Used for scenario-based questions
    scenario_text = models.TextField(
        blank=True, 
        default="", 
        help_text="The prompt or context for scenario-based questions."
    )
    
    explanation_text = models.TextField(
        blank=True, 
        default="", 
        help_text="Shown to students after submission for learning purposes."
    )
    
    difficulty_complexity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        help_text="1 (Easy) to 5 (Expert)"
    )
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    # ── Authorship tracking ───────────────────────────────────────────────────
    created_by = models.ForeignKey(
        "org_management.EmployeeMaster",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="created_questions",
        help_text="Employee who created this question. Used to filter by organisation."
    )

    class Meta:
        db_table = "asmt_question_bank"
        indexes = [
            models.Index(fields=["skill", "skill_level"], name="idx_qbank_skill_level"),
        ]

    def __str__(self):
        return f"[{self.get_question_type_display()}] {self.question_text[:50]}..."


class QuestionOption(models.Model):
    """
    Options for MCQ/MSQ/True-False questions.
    """
    question = models.ForeignKey(
        QuestionBank, 
        on_delete=models.CASCADE, 
        related_name="options"
    )
    option_text = models.TextField()
    is_correct = models.BooleanField(default=False)
    display_order = models.PositiveIntegerField(default=1)
    feedback_text = models.TextField(
        blank=True, 
        default="", 
        help_text="Specific feedback if this option is chosen."
    )

    class Meta:
        db_table = "asmt_question_option"
        ordering = ["display_order"]

    def __str__(self):
        return f"{self.option_text[:30]}"


class AssessmentQuestionMapping(models.Model):
    """
    Links QuestionBank to AssessmentMaster with instance-specific weightage.

    Two modes:
    - FIXED (course quizzes): attempt=None — mapping belongs to the assessment globally.
      Questions are pre-selected at assessment creation time.
    - DYNAMIC (standalone): attempt=<attempt> — mapping belongs to one specific attempt.
      Questions are selected by the algorithm at attempt start.
    """
    assessment = models.ForeignKey(
        AssessmentMaster, 
        on_delete=models.CASCADE, 
        related_name="question_mappings"
    )
    question = models.ForeignKey(
        QuestionBank, 
        on_delete=models.CASCADE, 
        related_name="assessment_usages"
    )
    # Null for FIXED mode; set to the attempt for DYNAMIC mode
    attempt = models.ForeignKey(
        "AssessmentAttempt",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="question_mappings",
        help_text="Set for DYNAMIC attempts. Null for FIXED (global) mappings."
    )
    weight_points = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=1.00,
        help_text="How many points this question is worth in this specific assessment."
    )
    time_limit_seconds = models.PositiveIntegerField(
        default=0,
        help_text="Time limit for this specific question in seconds. 0 for unlimited."
    )
    display_order = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "asmt_question_mapping"
        # Uniqueness: a question can appear once per assessment (FIXED) or once per attempt (DYNAMIC)
        constraints = [
            models.UniqueConstraint(
                fields=["assessment", "question"],
                condition=models.Q(attempt__isnull=True),
                name="uq_asmt_question_fixed",
            ),
            models.UniqueConstraint(
                fields=["attempt", "question"],
                condition=models.Q(attempt__isnull=False),
                name="uq_asmt_question_dynamic",
            ),
        ]
        ordering = ["display_order"]


class AssessmentAttempt(models.Model):
    """
    Represents a specific student's session for an assessment.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(
        "org_management.EmployeeMaster", 
        on_delete=models.CASCADE, 
        related_name="assessment_attempts"
    )
    assessment = models.ForeignKey(
        AssessmentMaster, 
        on_delete=models.CASCADE, 
        related_name="attempts"
    )
    
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(
        help_text="Calculated based on duration_minutes at start."
    )
    
    status = models.CharField(
        max_length=50,
        choices=AssessmentStatus.choices, # Reusing for simplicity or use AttemptStatus
        default="IN_PROGRESS"
    )
    
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        db_table = "asmt_attempt"
        ordering = ["-started_at"]

    def __str__(self):
        return f"{self.employee.employee_code} - {self.assessment.title} ({self.id})"


class UserAnswer(models.Model):
    """
    Stores individual question responses within an attempt.
    """
    attempt = models.ForeignKey(
        AssessmentAttempt, 
        on_delete=models.CASCADE, 
        related_name="answers"
    )
    question = models.ForeignKey(
        QuestionBank, 
        on_delete=models.PROTECT
    )
    
    # Stateful Tracking
    status = models.CharField(
        max_length=20,
        choices=[
            ("NOT_VISITED", "Not Visited"),
            ("ATTEMPTED", "Attempted"),
            ("TIMED_OUT", "Timed Out")
        ],
        default="NOT_VISITED"
    )
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)

    # Multi-Select Support
    selected_options = models.ManyToManyField(
        QuestionOption,
        blank=True,
        related_name="user_answers"
    )
    
    answer_text = models.TextField(blank=True, default="")
    uploaded_file = models.ForeignKey(
        "file_management.FileRegistry", 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
    )
    
    is_auto_graded = models.BooleanField(default=False)
    earned_points = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    class Meta:
        db_table = "asmt_user_answer"
        unique_together = ["attempt", "question"]


class AssessmentResult(models.Model):
    """
    Final rollup of an attempt's performance.
    """
    attempt = models.OneToOneField(
        AssessmentAttempt, 
        on_delete=models.CASCADE, 
        related_name="result"
    )
    
    total_score = models.DecimalField(max_digits=7, decimal_places=2, default=0.00)
    score_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    status = models.CharField(
        max_length=50,
        choices=[("PASS", "Pass"), ("FAIL", "Fail"), ("PENDING", "Pending Review")],
        default="PENDING"
    )
    
    grading_type = models.CharField(
        max_length=50,
        choices=GradingStatus.choices,
        default=GradingStatus.PENDING
    )
    
    instructor_feedback = models.TextField(blank=True, default="")
    graded_by = models.ForeignKey(
        "org_management.EmployeeMaster", 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True,
        related_name="graded_assessments"
    )
    graded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "asmt_result"


class AssessmentRetakeGrant(models.Model):
    """
    Records a one-time retake grant issued by an instructor/admin for a specific
    employee on a specific assessment.

    Each row represents one additional allowed attempt beyond the assessment's
    default retake_limit. The attempt service counts these grants and adds them
    to the base limit before enforcing the cap.

    Example:
        assessment.retake_limit = 1  (default — one attempt)
        AssessmentRetakeGrant rows for this employee+assessment = 1
        → effective limit = 2  (one retake allowed)
    """
    assessment = models.ForeignKey(
        AssessmentMaster,
        on_delete=models.CASCADE,
        related_name="retake_grants",
        help_text="The assessment this grant applies to."
    )
    employee = models.ForeignKey(
        "org_management.EmployeeMaster",
        on_delete=models.CASCADE,
        related_name="retake_grants",
        help_text="The learner who is granted the extra attempt."
    )
    granted_by = models.ForeignKey(
        "org_management.EmployeeMaster",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="issued_retake_grants",
        help_text="Instructor or admin who issued the grant."
    )
    note = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Optional reason for granting the retake."
    )
    granted_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "asmt_retake_grant"
        verbose_name = "Assessment Retake Grant"
        verbose_name_plural = "Assessment Retake Grants"
        ordering = ["-granted_at"]
        indexes = [
            models.Index(fields=["assessment", "employee"], name="idx_retake_grant_asmt_emp"),
        ]

    def __str__(self):
        return (
            f"RetakeGrant<{self.employee.employee_code} → "
            f"{self.assessment.title} by {self.granted_by}>"
        )


class AssessmentSkillMapping(models.Model):
    """
    Maps a standalone assessment to one or more skills with a target proficiency level.

    When a learner passes the assessment, a SkillUpgradeProposal is created for
    each mapped skill (unless the learner already holds an equal or higher level).
    """
    assessment = models.ForeignKey(
        AssessmentMaster,
        on_delete=models.CASCADE,
        related_name="skill_mappings",
        help_text="The standalone assessment this mapping belongs to."
    )
    skill = models.ForeignKey(
        "skill_management.SkillMaster",
        on_delete=models.CASCADE,
        related_name="assessment_mappings",
        help_text="Skill that this assessment evaluates."
    )
    skill_level = models.ForeignKey(
        "skill_management.SkillLevelMaster",
        on_delete=models.PROTECT,
        related_name="assessment_mappings",
        help_text="Target proficiency level awarded on passing this assessment."
    )

    class Meta:
        db_table = "asmt_skill_mapping"
        unique_together = ["assessment", "skill"]
        verbose_name = "Assessment Skill Mapping"
        verbose_name_plural = "Assessment Skill Mappings"

    def __str__(self):
        return f"{self.assessment.title} → {self.skill.skill_name} ({self.skill_level.level_name})"


class SkillUpgradeProposal(models.Model):
    """
    Created automatically when a learner passes a standalone assessment.
    One proposal per skill per passing attempt.

    Lifecycle:
        PENDING  → approver reviews → APPROVED
        On APPROVED: EmployeeSkill is updated if the proposed level is higher
                     than the current recorded level.

    Rules:
        - Never created if the learner already holds an equal or higher skill level.
        - Cannot be rejected — only approved (or left pending).
        - Approver must hold SKILL_UPGRADE_APPROVE permission.
    """
    employee = models.ForeignKey(
        "org_management.EmployeeMaster",
        on_delete=models.CASCADE,
        related_name="skill_upgrade_proposals",
        help_text="Learner whose skill level is proposed for upgrade."
    )
    assessment_attempt = models.ForeignKey(
        AssessmentAttempt,
        on_delete=models.CASCADE,
        related_name="skill_upgrade_proposals",
        help_text="The passing attempt that triggered this proposal."
    )
    skill = models.ForeignKey(
        "skill_management.SkillMaster",
        on_delete=models.CASCADE,
        related_name="upgrade_proposals",
    )
    proposed_level = models.ForeignKey(
        "skill_management.SkillLevelMaster",
        on_delete=models.PROTECT,
        related_name="upgrade_proposals",
        help_text="The skill level being proposed."
    )
    status = models.CharField(
        max_length=20,
        choices=SkillUpgradeStatus.choices,
        default=SkillUpgradeStatus.PENDING,
    )
    approved_by = models.ForeignKey(
        "org_management.EmployeeMaster",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="approved_skill_upgrades",
        help_text="Employee who approved the upgrade."
    )
    approved_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "asmt_skill_upgrade_proposal"
        verbose_name = "Skill Upgrade Proposal"
        verbose_name_plural = "Skill Upgrade Proposals"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["employee", "status"], name="idx_sup_employee_status"),
            models.Index(fields=["skill", "status"],    name="idx_sup_skill_status"),
        ]

    def __str__(self):
        return (
            f"SkillUpgrade<{self.employee.employee_code} → "
            f"{self.skill.skill_name} {self.proposed_level.level_name} [{self.status}]>"
        )
