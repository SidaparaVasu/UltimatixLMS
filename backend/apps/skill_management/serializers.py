from rest_framework import serializers
from .models import (
    SkillCategoryMaster,
    SkillMaster,
    SkillCategorySkillMap,
    SkillLevelMaster,
    JobRoleSkillRequirement,
    EmployeeSkill,
    EmployeeSkillHistory,
    EmployeeSkillAssessment,
    EmployeeSkillRating,
    EmployeeSkillRatingHistory,
)


class SkillCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillCategoryMaster
        fields = "__all__"


class SkillMasterSerializer(serializers.ModelSerializer):
    parent_skill_name = serializers.CharField(source="parent_skill.skill_name", read_only=True)

    class Meta:
        model = SkillMaster
        fields = "__all__"


class SkillCategoryMappingSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.skill_name", read_only=True)
    category_name = serializers.CharField(source="category.category_name", read_only=True)

    class Meta:
        model = SkillCategorySkillMap
        fields = "__all__"


class SkillLevelSerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillLevelMaster
        fields = "__all__"


class SkillDetailSerializer(SkillMasterSerializer):
    """
    Serializer providing nested mappings or child skills for detailed views.
    """
    child_skills = serializers.SerializerMethodField()

    def get_child_skills(self, obj):
        children = obj.child_skills.filter(is_active=True)
        return SkillMasterSerializer(children, many=True).data


class JobRoleSkillRequirementSerializer(serializers.ModelSerializer):
    job_role_name = serializers.CharField(source="job_role.job_role_name", read_only=True)
    skill_name = serializers.CharField(source="skill.skill_name", read_only=True)
    required_level_name = serializers.CharField(source="required_level.level_name", read_only=True)

    class Meta:
        model = JobRoleSkillRequirement
        fields = "__all__"


class EmployeeSkillSerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(source="employee.employee_code", read_only=True)
    skill_name = serializers.CharField(source="skill.skill_name", read_only=True)
    level_name = serializers.CharField(source="current_level.level_name", read_only=True)

    class Meta:
        model = EmployeeSkill
        fields = "__all__"


class EmployeeSkillHistorySerializer(serializers.ModelSerializer):
    old_level_name = serializers.CharField(source="old_level.level_name", read_only=True)
    new_level_name = serializers.CharField(source="new_level.level_name", read_only=True)
    skill_name = serializers.CharField(source="skill.skill_name", read_only=True)

    class Meta:
        model = EmployeeSkillHistory
        fields = "__all__"


class EmployeeSkillAssessmentSerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(source="employee.employee_code", read_only=True)
    skill_name = serializers.CharField(source="skill.skill_name", read_only=True)
    result_level_name = serializers.CharField(source="result_level.level_name", read_only=True)

    class Meta:
        model = EmployeeSkillAssessment
        fields = "__all__"

class SkillRequirementItemSerializer(serializers.Serializer):
    skill_id = serializers.IntegerField()
    level_id = serializers.IntegerField()


class JobRoleSkillBulkSyncSerializer(serializers.Serializer):
    job_role_id = serializers.IntegerField()
    requirements = SkillRequirementItemSerializer(many=True)


class EmployeeSkillBulkSyncSerializer(serializers.Serializer):
    employee_id = serializers.IntegerField()
    skills = SkillRequirementItemSerializer(many=True)


# ---------------------------------------------------------------------------
# EmployeeSkillRating serializers
# ---------------------------------------------------------------------------

class EmployeeSkillRatingSerializer(serializers.ModelSerializer):
    """
    Full read/write serializer for EmployeeSkillRating rows.
    Used for list, retrieve, and create/update actions.
    """
    skill_name      = serializers.CharField(source="skill.skill_name",           read_only=True)
    rated_level_name = serializers.CharField(source="rated_level.level_name",    read_only=True)
    rated_level_rank = serializers.IntegerField(source="rated_level.level_rank", read_only=True)
    rated_by_name   = serializers.SerializerMethodField()

    class Meta:
        model  = EmployeeSkillRating
        fields = "__all__"

    def get_rated_by_name(self, obj):
        try:
            profile = obj.rated_by.user.profile
            return f"{profile.first_name} {profile.last_name}".strip()
        except Exception:
            return str(obj.rated_by.employee_code)


class EmployeeSkillRatingHistorySerializer(serializers.ModelSerializer):
    """Read-only serializer for the rating audit log."""
    skill_name      = serializers.CharField(source="skill.skill_name",           read_only=True)
    old_level_name  = serializers.CharField(source="old_level.level_name",       read_only=True)
    new_level_name  = serializers.CharField(source="new_level.level_name",       read_only=True)
    rated_by_name   = serializers.CharField(source="rated_by.employee_code",     read_only=True)

    class Meta:
        model  = EmployeeSkillRatingHistory
        fields = "__all__"


# ---------------------------------------------------------------------------
# Skill Matrix serializers  (composite read-only view)
# ---------------------------------------------------------------------------

class SkillLevelNestedSerializer(serializers.ModelSerializer):
    class Meta:
        model  = SkillLevelMaster
        fields = ["id", "level_name", "level_rank"]


class RatingNestedSerializer(serializers.ModelSerializer):
    rated_level = SkillLevelNestedSerializer(read_only=True)

    class Meta:
        model  = EmployeeSkillRating
        fields = ["id", "rated_level", "status", "submitted_at"]


class SkillMatrixRowSerializer(serializers.Serializer):
    """
    Read-only composite row returned by /skills/my-skill-matrix/.
    Combines: skill info + required level + current level + self-rating
              + manager-rating + gap value + gap severity.
    """
    skill_id        = serializers.IntegerField()
    skill_name      = serializers.CharField()
    skill_code      = serializers.CharField()
    category_id     = serializers.IntegerField(allow_null=True)
    category_name   = serializers.CharField(allow_null=True)
    required_level  = SkillLevelNestedSerializer(allow_null=True)
    current_level   = SkillLevelNestedSerializer(allow_null=True)
    identified_by   = serializers.CharField(allow_null=True)
    self_rating     = RatingNestedSerializer(allow_null=True)
    manager_rating  = RatingNestedSerializer(allow_null=True)
    gap_value       = serializers.IntegerField(allow_null=True)
    gap_severity    = serializers.ChoiceField(
        choices=["NONE", "MINOR", "CRITICAL", "NOT_RATED"],
        allow_null=True,
    )


class SelfRatingDetailSerializer(serializers.ModelSerializer):
    """
    Extended self-rating nested object — includes observations and accomplishments
    so the manager can read the employee's context while reviewing.
    """
    rated_level = SkillLevelNestedSerializer(read_only=True)

    class Meta:
        model  = EmployeeSkillRating
        fields = ["id", "rated_level", "status", "submitted_at", "observations", "accomplishments"]


class ManagerRatingDetailSerializer(serializers.ModelSerializer):
    """
    Extended manager-rating nested object — includes notes and status.
    """
    rated_level = SkillLevelNestedSerializer(read_only=True)

    class Meta:
        model  = EmployeeSkillRating
        fields = ["id", "rated_level", "status", "submitted_at", "notes"]


class ManagerReviewRowSerializer(serializers.Serializer):
    """
    Read-only composite row returned by /skills/skill-ratings/manager-review-matrix/.

    Assembles one row per skill the employee has self-rated, enriched with:
      - required level from the employee's job role (null for extra skills)
      - the employee's full self-rating (including observations + accomplishments)
      - the manager's existing rating for this skill (null if not yet rated)
      - live gap preview: compares manager's current rating against required level
      - category grouping
      - is_role_skill flag to distinguish job-role skills from extra self-rated skills
    """
    skill_id          = serializers.IntegerField()
    skill_name        = serializers.CharField()
    skill_code        = serializers.CharField()
    category_id       = serializers.IntegerField(allow_null=True)
    category_name     = serializers.CharField(allow_null=True)
    is_role_skill     = serializers.BooleanField()
    required_level    = SkillLevelNestedSerializer(allow_null=True)
    self_rating       = SelfRatingDetailSerializer(allow_null=True)
    manager_rating    = ManagerRatingDetailSerializer(allow_null=True)


# ---------------------------------------------------------------------------
# Action input serializers
# ---------------------------------------------------------------------------

class SelfRatingItemSerializer(serializers.Serializer):
    skill_id        = serializers.IntegerField()
    level_id        = serializers.IntegerField()
    observations    = serializers.CharField(required=False, allow_blank=True, default="")
    accomplishments = serializers.CharField(required=False, allow_blank=True, default="")


class SelfRatingBulkSaveSerializer(serializers.Serializer):
    """Input for POST /skills/skill-ratings/save-draft/ (bulk upsert)."""
    ratings = SelfRatingItemSerializer(many=True)


class ManagerRatingItemSerializer(serializers.Serializer):
    skill_id = serializers.IntegerField()
    level_id = serializers.IntegerField()
    notes    = serializers.CharField(required=False, allow_blank=True, default="")


class ManagerRatingSubmitSerializer(serializers.Serializer):
    """Input for POST /skills/skill-ratings/manager-submit/."""
    employee_id = serializers.IntegerField()
    ratings     = ManagerRatingItemSerializer(many=True)
