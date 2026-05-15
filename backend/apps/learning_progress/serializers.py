from rest_framework import serializers
from .models import (
    LearningPathMaster,
    LearningPathCourseMap,
    UserCourseEnrollment,
    UserLessonProgress,
    UserContentProgress,
    CourseCertificate
)
from apps.course_management.models import CourseMaster, CourseSection


class LearningPathSerializer(serializers.ModelSerializer):
    class Meta:
        model = LearningPathMaster
        fields = "__all__"


class UserContentProgressSerializer(serializers.ModelSerializer):
    """
    Stores playhead and completion for a specific video or asset.
    """
    class Meta:
        model = UserContentProgress
        fields = ["content", "playhead_seconds", "is_completed", "last_accessed_at"]


class UserLessonProgressSerializer(serializers.ModelSerializer):
    """
    Stores completion at lesson level with nested asset progress.
    """
    content_progress = UserContentProgressSerializer(many=True, read_only=True)

    class Meta:
        model = UserLessonProgress
        fields = ["lesson", "status", "completed_at", "content_progress"]


class UserCourseEnrollmentSerializer(serializers.ModelSerializer):
    """
    Dashboard view showing progress summary across multiple courses.
    """
    course_title = serializers.CharField(source="course.course_title", read_only=True)
    course_code = serializers.CharField(source="course.course_code", read_only=True)
    category_name = serializers.CharField(source="course.category.category_name", read_only=True)
    # Mandatory / overdue computed fields
    is_mandatory = serializers.BooleanField(source="course.is_mandatory", read_only=True)
    show_marks_to_learners = serializers.BooleanField(source="course.show_marks_to_learners", read_only=True)
    effective_due_date = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()

    class Meta:
        model = UserCourseEnrollment
        fields = [
            "id", "course", "course_title", "course_code", "category_name",
            "enrollment_type", "status", "progress_percentage", "enrolled_at",
            "started_at", "completed_at",
            "extended_due_date", "is_mandatory", "show_marks_to_learners",
            "effective_due_date", "is_overdue",
        ]

    def get_effective_due_date(self, obj) -> str | None:
        """
        Returns the per-learner deadline:
        extended_due_date if set, otherwise course.end_date.
        """
        if obj.extended_due_date:
            return str(obj.extended_due_date)
        if obj.course.end_date:
            return str(obj.course.end_date)
        return None

    def get_is_overdue(self, obj) -> bool:
        """
        True when:
        - course is mandatory
        - enrollment is not completed
        - effective due date has passed
        """
        from django.utils import timezone
        if not obj.course.is_mandatory:
            return False
        if obj.status == "COMPLETED":
            return False
        due = obj.extended_due_date or obj.course.end_date
        if not due:
            return False
        return timezone.now().date() > due


class DetailedEnrollmentProgressSerializer(UserCourseEnrollmentSerializer):
    """
    Full hierarchical progress for the course player (Course > Lesson > Asset Status).
    """
    lesson_progress = UserLessonProgressSerializer(many=True, read_only=True)

    class Meta(UserCourseEnrollmentSerializer.Meta):
        fields = UserCourseEnrollmentSerializer.Meta.fields + ["lesson_progress"]

class HeartbeatSyncSerializer(serializers.Serializer):
    """
    Input schema for the player to save progress heartbeats.
    """
    enrollment_id = serializers.IntegerField()
    lesson_id = serializers.IntegerField()
    content_id = serializers.IntegerField()
    playhead_seconds = serializers.IntegerField(min_value=0)
    # Allows signaling explicit completion (e.g. at the end of video)
    signal_completion = serializers.BooleanField(default=False)


class CourseCertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = CourseCertificate
        fields = "__all__"
