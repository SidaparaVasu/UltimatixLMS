from django.db import models
from apps.org_management.models import EmployeeMaster
from apps.skill_management.models import SkillMaster, SkillLevelMaster
from .constants import DifficultyLevel, CourseContentType


class CourseCategoryMaster(models.Model):
    """
    Groups courses into logical domains like Programming, HR, etc.
    """
    category_name = models.CharField(max_length=100)
    category_code = models.CharField(max_length=50, unique=True)
    description = models.CharField(max_length=255, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "course_category_master"
        verbose_name = "Course Category"
        verbose_name_plural = "Course Categories"
        indexes = [models.Index(fields=["category_code"], name="idx_crs_cat_code")]

    def __str__(self):
        return self.category_name


class CourseMaster(models.Model):
    """
    The central course metadata entity.
    """
    course_title = models.CharField(max_length=200)
    course_code = models.CharField(max_length=100, unique=True)
    category = models.ForeignKey(
        CourseCategoryMaster, 
        on_delete=models.PROTECT, 
        related_name="courses"
    )
    description = models.TextField(blank=True, default="")
    difficulty_level = models.CharField(
        max_length=50,
        choices=DifficultyLevel.choices,
        default=DifficultyLevel.BEGINNER
    )
    estimated_duration_hours = models.PositiveIntegerField(default=0)
    created_by = models.ForeignKey(
        EmployeeMaster, 
        on_delete=models.SET_NULL, 
        null=True, 
        related_name="authored_courses"
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "course_master"
        verbose_name = "Course Master"
        verbose_name_plural = "Course Masters"
        indexes = [
            models.Index(fields=["course_code"], name="idx_crs_master_code"),
            models.Index(fields=["category"], name="idx_crs_master_cat_id"),
        ]

    def __str__(self):
        return f"{self.course_code} - {self.course_title}"


class TagMaster(models.Model):
    """
    Global reusable labels for classification.
    """
    tag_name = models.CharField(max_length=100, unique=True)
    description = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "course_tag_master"
        verbose_name = "Tag Master"
        verbose_name_plural = "Tag Masters"
        indexes = [models.Index(fields=["tag_name"], name="idx_crs_tag_name")]

    def __str__(self):
        return self.tag_name


class CourseTagMap(models.Model):
    """
    Many-to-many relationship registry for course tagging.
    """
    course = models.ForeignKey(CourseMaster, on_delete=models.CASCADE, related_name="tags")
    tag = models.ForeignKey(TagMaster, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "course_tag_map"
        unique_together = ["course", "tag"]


class CourseSkillMapping(models.Model):
    """
    Defines the competencies built by completing the course.
    """
    course = models.ForeignKey(CourseMaster, on_delete=models.CASCADE, related_name="skilled_outcomes")
    skill = models.ForeignKey(SkillMaster, on_delete=models.CASCADE)
    target_level = models.ForeignKey(SkillLevelMaster, on_delete=models.PROTECT)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "course_skill_mapping"
        unique_together = ["course", "skill"]


class CourseSection(models.Model):
    """
    Logical grouping (Chapters/Blocks) within a course.
    """
    course = models.ForeignKey(CourseMaster, on_delete=models.CASCADE, related_name="sections")
    section_title = models.CharField(max_length=150)
    display_order = models.PositiveIntegerField(default=1)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "course_section"
        ordering = ["display_order"]
        verbose_name = "Course Section"
        verbose_name_plural = "Course Sections"

    def __str__(self):
        return f"{self.course.course_title} - {self.section_title}"


class CourseLesson(models.Model):
    """
    Individual learning topics within a section.
    """
    section = models.ForeignKey(CourseSection, on_delete=models.CASCADE, related_name="lessons")
    lesson_title = models.CharField(max_length=200)
    display_order = models.PositiveIntegerField(default=1)
    estimated_duration_minutes = models.PositiveIntegerField(default=15)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "course_lesson"
        ordering = ["display_order"]

    def __str__(self):
        return self.lesson_title


class CourseContent(models.Model):
    """
    The actual learning assets (Video, PDF, etc.) for a lesson.
    """
    lesson = models.ForeignKey(CourseLesson, on_delete=models.CASCADE, related_name="contents")
    content_type = models.CharField(
        max_length=50,
        choices=CourseContentType.choices,
        default=CourseContentType.VIDEO
    )
    content_url = models.URLField(max_length=500, blank=True, default="")
    file_path = models.CharField(max_length=500, blank=True, default="")
    display_order = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "course_content"
        ordering = ["display_order"]


class CourseResource(models.Model):
    """
    Additional supplementary material at the course level.
    """
    course = models.ForeignKey(CourseMaster, on_delete=models.CASCADE, related_name="resources")
    resource_title = models.CharField(max_length=200)
    resource_url = models.URLField(max_length=500, blank=True, default="")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "course_resource"


class CourseDiscussionThread(models.Model):
    """
    Community interaction topics.
    """
    course = models.ForeignKey(CourseMaster, on_delete=models.CASCADE, related_name="discussion_threads")
    created_by = models.ForeignKey(EmployeeMaster, on_delete=models.CASCADE)
    thread_title = models.CharField(max_length=255)
    thread_body = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "course_discussion_thread"


class CourseDiscussionReply(models.Model):
    """
    Nested comments in a discussion thread.
    """
    thread = models.ForeignKey(CourseDiscussionThread, on_delete=models.CASCADE, related_name="replies")
    created_by = models.ForeignKey(EmployeeMaster, on_delete=models.CASCADE)
    reply_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "course_discussion_reply"
