from django.db import models


class DifficultyLevel(models.TextChoices):
    BEGINNER = "BEGINNER", "Beginner"
    INTERMEDIATE = "INTERMEDIATE", "Intermediate"
    ADVANCED = "ADVANCED", "Advanced"


class CourseContentType(models.TextChoices):
    VIDEO = "VIDEO", "Video"
    PDF = "PDF", "PDF"
    PPT = "PPT", "PPT"
    DOCUMENT = "DOCUMENT", "Document"
    LINK = "LINK", "External Link"
    QUIZ = "QUIZ", "Quiz"
