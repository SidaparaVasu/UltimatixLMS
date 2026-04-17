import uuid
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from .constants import QuestionType, AssessmentStatus, GradingStatus
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
        on_delete=models.CASCADE, 
        related_name="assessments"
    )
    # Optional: Link directly to a lesson if it's a mid-module quiz
    lesson = models.ForeignKey(
        CourseLesson, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="quizzes"
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
    
    is_randomized = models.BooleanField(
        default=False, 
        help_text="If true, question order will be shuffled for each student."
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
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "asmt_master"
        verbose_name = "Assessment"
        verbose_name_plural = "Assessments"

    def __str__(self):
        return self.title


class QuestionBank(models.Model):
    """
    Stores individual questions that can be mapped to multiple assessments.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question_text = models.TextField()
    question_type = models.CharField(
        max_length=50,
        choices=QuestionType.choices,
        default=QuestionType.MCQ
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

    class Meta:
        db_table = "asmt_question_bank"

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
    weight_points = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=1.00,
        help_text="How many points this question is worth in this specific assessment."
    )
    display_order = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "asmt_question_mapping"
        unique_together = ["assessment", "question"]
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
    
    # Generic storage fields for different question types
    selected_option = models.ForeignKey(
        QuestionOption, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True
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
