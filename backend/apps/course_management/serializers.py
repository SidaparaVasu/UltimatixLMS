from rest_framework import serializers
from django.db.models import Count
from .models import (
    CourseCategoryMaster,
    CourseMaster,
    CourseStatus,
    VALID_STATUS_TRANSITIONS,
    TagMaster,
    CourseTagMap,
    CourseSkillMapping,
    CourseSection,
    CourseLesson,
    CourseContent,
    CourseResource,
    CourseDiscussionThread,
    CourseDiscussionReply,
    CourseParticipant,
    CourseNote,
)
from apps.org_management.models import EmployeeMaster


class CourseCategorySerializer(serializers.ModelSerializer):
    course_count = serializers.IntegerField(read_only=True)
    class Meta:
        model = CourseCategoryMaster
        fields = "__all__"


class TagSerializer(serializers.ModelSerializer):
    class Meta:
        model = TagMaster
        fields = "__all__"


class CourseTagMapSerializer(serializers.ModelSerializer):
    tag_name = serializers.CharField(source="tag.tag_name", read_only=True)

    class Meta:
        model = CourseTagMap
        fields = "__all__"


class CourseSkillMappingSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.skill_name", read_only=True)
    target_level_name = serializers.CharField(source="target_level.level_name", read_only=True)

    class Meta:
        model = CourseSkillMapping
        fields = "__all__"


class CourseContentSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = CourseContent
        fields = "__all__"

    def get_file_url(self, obj):
        if obj.file_ref and obj.file_ref.file:
            return obj.file_ref.file.url
        return None


class CourseLessonSerializer(serializers.ModelSerializer):
    contents = CourseContentSerializer(many=True, read_only=True)
    assessment_id = serializers.SerializerMethodField()

    class Meta:
        model = CourseLesson
        fields = "__all__"

    def get_assessment_id(self, obj):
        """Return the linked AssessmentMaster id if this lesson has a quiz."""
        quiz = obj.quizzes.first()
        return quiz.id if quiz else None


class CourseSectionSerializer(serializers.ModelSerializer):
    lessons = CourseLessonSerializer(many=True, read_only=True)

    class Meta:
        model = CourseSection
        fields = "__all__"


class CourseMasterSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.category_name", read_only=True)
    author_name = serializers.CharField(source="created_by.user.get_full_name", read_only=True)
    participant_count = serializers.SerializerMethodField()
    total_sections = serializers.SerializerMethodField()
    total_lessons = serializers.SerializerMethodField()

    class Meta:
        model = CourseMaster
        fields = (
            "id", "course_title", "course_code", "category", "category_name",
            "description", "difficulty_level", "estimated_duration_hours",
            "start_date", "end_date", "show_marks_to_learners",
            "status", "created_by", "author_name", "is_active",
            "participant_count", "total_sections", "total_lessons",
            "created_at", "updated_at",
        )
        read_only_fields = ("created_by", "created_at", "updated_at")
        extra_kwargs = {
            "course_code": {"required": True},
        }

    def update(self, instance, validated_data):
        # course_code is immutable after creation — silently drop it on updates
        validated_data.pop("course_code", None)
        return super().update(instance, validated_data)

    def get_participant_count(self, obj) -> int:
        return obj.participants.count()

    def get_total_sections(self, obj) -> int:
        total_sections = CourseSection.objects.filter(course_id=obj.id).count()
        return total_sections

    def get_total_lessons(self, obj) -> int:
        total_lessons = CourseLesson.objects.filter(section__course_id=obj.id).count()
        return total_lessons

    def validate_status(self, new_status):
        """Enforce the status state machine on updates."""
        instance = self.instance
        if instance is None:
            # On create, only DRAFT is allowed
            if new_status != CourseStatus.DRAFT:
                raise serializers.ValidationError("New courses must start in DRAFT status.")
            return new_status

        current_status = instance.status
        if current_status == new_status:
            return new_status  # no-op, always valid

        allowed = VALID_STATUS_TRANSITIONS.get(current_status, set())
        if new_status not in allowed:
            raise serializers.ValidationError(
                f"Cannot transition from '{current_status}' to '{new_status}'. "
                f"Allowed transitions: {[s for s in allowed] or 'none'}."
            )
        return new_status


class CourseResourceSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()
    original_name = serializers.SerializerMethodField()

    class Meta:
        model = CourseResource
        fields = "__all__"

    def get_file_url(self, obj):
        if obj.file_ref and obj.file_ref.file:
            return obj.file_ref.file.url
        return None

    def get_original_name(self, obj):
        if obj.file_ref:
            return obj.file_ref.original_name
        return None
        

class CourseDetailSerializer(CourseMasterSerializer):
    """
    Rich serializer delivering the full course journey.
    """
    sections = CourseSectionSerializer(many=True, read_only=True)
    tags = CourseTagMapSerializer(many=True, read_only=True)
    skills = CourseSkillMappingSerializer(source="skilled_outcomes", many=True, read_only=True)
    resources = serializers.SerializerMethodField()

    class Meta(CourseMasterSerializer.Meta):
        fields = CourseMasterSerializer.Meta.fields + ("sections", "tags", "skills", "resources")

    def get_resources(self, obj):
        active_resources = obj.resources.filter(is_active=True)
        return CourseResourceSerializer(active_resources, many=True).data



class CourseDiscussionReplySerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()

    class Meta:
        model = CourseDiscussionReply
        fields = "__all__"
        read_only_fields = ["id", "created_by", "created_at"]

    def get_author_name(self, obj):
        try:
            p = obj.created_by.user.profile
            return f"{p.first_name} {p.last_name}".strip() or obj.created_by.user.username
        except Exception:
            return obj.created_by.user.username if obj.created_by else "Unknown"


# --- STUDIO BULK SYNC SERIALIZERS ---

class CourseContentSyncSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False) # Optional for new content
    class Meta:
        model = CourseContent
        fields = ["id", "content_type", "content_url", "file_ref", "display_order"]


class CourseLessonSyncSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    contents = CourseContentSyncSerializer(many=True, required=False)

    class Meta:
        model = CourseLesson
        fields = ["id", "lesson_title", "estimated_duration_minutes", "require_mark_complete", "display_order", "contents"]


class CourseSectionSyncSerializer(serializers.ModelSerializer):
    id = serializers.IntegerField(required=False)
    lessons = CourseLessonSyncSerializer(many=True, required=False)

    class Meta:
        model = CourseSection
        fields = ["id", "section_title", "description", "display_order", "lessons"]


class CurriculumSyncSerializer(serializers.Serializer):
    sections = CourseSectionSyncSerializer(many=True)


class CourseDiscussionThreadSerializer(serializers.ModelSerializer):
    author_name = serializers.SerializerMethodField()
    reply_count = serializers.SerializerMethodField()
    replies = CourseDiscussionReplySerializer(many=True, read_only=True)

    class Meta:
        model = CourseDiscussionThread
        fields = "__all__"
        read_only_fields = ["id", "created_by", "created_at"]

    def get_author_name(self, obj):
        try:
            p = obj.created_by.user.profile
            return f"{p.first_name} {p.last_name}".strip() or obj.created_by.user.username
        except Exception:
            return obj.created_by.user.username if obj.created_by else "Unknown"

    def get_reply_count(self, obj):
        return obj.replies.count()


# ── Course Participant Serializers ────────────────────────────────────────────

class CourseParticipantSerializer(serializers.ModelSerializer):
    """Read serializer — returns participant with employee display info."""
    employee_full_name = serializers.SerializerMethodField()
    employee_email = serializers.SerializerMethodField()
    employee_code = serializers.CharField(source="employee.employee_code", read_only=True)

    class Meta:
        model = CourseParticipant
        fields = (
            "id", "course", "employee", "employee_code",
            "employee_full_name", "employee_email",
            "invited_by", "invited_at", "notification_sent",
        )
        read_only_fields = ("id", "invited_at", "notification_sent")

    def get_employee_full_name(self, obj) -> str:
        try:
            profile = obj.employee.user.userprofile
            return f"{profile.first_name} {profile.last_name}".strip()
        except Exception:
            return str(obj.employee)

    def get_employee_email(self, obj) -> str:
        try:
            return obj.employee.user.email
        except Exception:
            return ""


class CourseParticipantBulkInviteSerializer(serializers.Serializer):
    """Write serializer — accepts a list of employee IDs to invite."""
    employee_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        min_length=1,
        help_text="List of EmployeeMaster IDs to invite to the course.",
    )

    def validate_employee_ids(self, ids):
        existing = set(
            EmployeeMaster.objects.filter(id__in=ids).values_list("id", flat=True)
        )
        missing = set(ids) - existing
        if missing:
            raise serializers.ValidationError(
                f"The following employee IDs do not exist: {sorted(missing)}"
            )
        return ids


# ── Course Note Serializers ───────────────────────────────────────────────────

class CourseNoteSerializer(serializers.ModelSerializer):
    """
    Read/write serializer for learner notes.
    enrollment and lesson_title are read-only — the view injects enrollment
    from the authenticated user's context.
    """
    lesson_title = serializers.CharField(source="lesson.lesson_title", read_only=True)
    section_title = serializers.CharField(source="lesson.section.section_title", read_only=True)

    class Meta:
        model = CourseNote
        fields = (
            "id", "enrollment", "lesson", "lesson_title", "section_title",
            "note_text", "created_at", "updated_at",
        )
        read_only_fields = ("id", "enrollment", "lesson_title", "section_title", "created_at", "updated_at")


class CourseNoteCreateSerializer(serializers.Serializer):
    """Input schema for creating a note — enrollment is resolved server-side."""
    enrollment_id = serializers.IntegerField()
    lesson_id = serializers.IntegerField(required=False, allow_null=True, default=None)
    note_text = serializers.CharField(min_length=1)


class CourseNoteUpdateSerializer(serializers.Serializer):
    """Input schema for updating note text only."""
    note_text = serializers.CharField(min_length=1)
