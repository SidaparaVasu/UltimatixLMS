from django.db import models


class QuestionType(models.TextChoices):
    MCQ = "MCQ", "Single Choice (MCQ)"
    MSQ = "MSQ", "Multiple Select (MSQ)"
    TRUE_FALSE = "TRUE_FALSE", "True/False"
    DESCRIPTIVE = "DESCRIPTIVE", "Descriptive / Long Answer"
    SCENARIO = "SCENARIO", "Scenario-based Question"
    FILE_UPLOAD = "FILE_UPLOAD", "File Upload Assignment"


class AssessmentStatus(models.TextChoices):
    DRAFT = "DRAFT", "Draft"
    PUBLISHED = "PUBLISHED", "Published"
    ARCHIVED = "ARCHIVED", "Archived"


class QuestionSelectionMode(models.TextChoices):
    FIXED   = "FIXED",   "Fixed — questions pre-mapped at assessment creation (course quizzes)"
    DYNAMIC = "DYNAMIC", "Dynamic — questions selected from bank at attempt start (standalone)"
    CURATED = "CURATED", "Curated — manually selects questions from question bank (standalone)"


class AttemptStatus(models.TextChoices):
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    SUBMITTED = "SUBMITTED", "Submitted"
    EVALUATING = "EVALUATING", "Evaluating"
    COMPLETED = "COMPLETED", "Completed"
    EXPIRED = "EXPIRED", "Timed Out"


class GradingStatus(models.TextChoices):
    PENDING = "PENDING", "Pending Manual Review"
    AUTO_GRADED = "AUTO_GRADED", "Auto Graded"
    MANUALLY_GRADED = "MANUALLY_GRADED", "Manually Graded"


class ResultStatus(models.TextChoices):
    PASS = "PASS", "Passed"
    FAIL = "FAIL", "Failed"
    PENDING = "PENDING", "Pending Review"


class SkillUpgradeStatus(models.TextChoices):
    PENDING  = "PENDING",  "Pending Approval"
    APPROVED = "APPROVED", "Approved"
