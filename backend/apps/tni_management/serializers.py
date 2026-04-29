from rest_framework import serializers
from .models import (
    TrainingNeed,
    SkillGapSnapshot,
    ComplianceTrainingRequirement,
    TrainingNeedApproval,
    TrainingNeedCourseRecommendation,
    TNIAggregatedAnalysis
)


def _get_employee_full_name(employee):
    """
    Resolve full name from EmployeeMaster → AuthUser → AuthUserProfile.
    Falls back to employee_code if profile is not available.
    """
    try:
        profile = employee.user.profile
        name = f"{profile.first_name} {profile.last_name}".strip()
        return name if name else employee.employee_code
    except Exception:
        return employee.employee_code


class TrainingNeedSerializer(serializers.ModelSerializer):
    employee_code  = serializers.CharField(source="employee.employee_code", read_only=True)
    employee_name  = serializers.SerializerMethodField()
    skill_name     = serializers.CharField(source="skill.skill_name", read_only=True)
    # Gap info — pulled from the most recent SkillGapSnapshot for this employee+skill
    gap_value          = serializers.SerializerMethodField()
    required_level_name = serializers.SerializerMethodField()
    current_level_name  = serializers.SerializerMethodField()

    class Meta:
        model  = TrainingNeed
        fields = "__all__"

    def get_employee_name(self, obj):
        return _get_employee_full_name(obj.employee)

    def _get_latest_snapshot(self, obj):
        """Return the most recent active SkillGapSnapshot for this need."""
        from apps.tni_management.models import SkillGapSnapshot
        return (
            SkillGapSnapshot.objects
            .filter(employee=obj.employee, skill=obj.skill, is_active=True)
            .select_related("required_level", "current_level")
            .order_by("-detected_at")
            .first()
        )

    def get_gap_value(self, obj):
        snap = self._get_latest_snapshot(obj)
        return snap.gap_value if snap else None

    def get_required_level_name(self, obj):
        snap = self._get_latest_snapshot(obj)
        return snap.required_level.level_name if snap and snap.required_level else None

    def get_current_level_name(self, obj):
        snap = self._get_latest_snapshot(obj)
        return snap.current_level.level_name if snap and snap.current_level else None


class SkillGapSnapshotSerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(source="employee.employee_code", read_only=True)
    skill_name = serializers.CharField(source="skill.skill_name", read_only=True)
    required_level_name = serializers.CharField(source="required_level.level_name", read_only=True)
    current_level_name = serializers.CharField(source="current_level.level_name", read_only=True)

    class Meta:
        model = SkillGapSnapshot
        fields = "__all__"


class ComplianceRequirementSerializer(serializers.ModelSerializer):
    job_role_name = serializers.CharField(source="job_role.job_role_name", read_only=True)

    class Meta:
        model = ComplianceTrainingRequirement
        fields = "__all__"


class TrainingNeedApprovalSerializer(serializers.ModelSerializer):
    approver_name         = serializers.SerializerMethodField()
    training_need_display = serializers.CharField(source="training_need.__str__", read_only=True)

    class Meta:
        model  = TrainingNeedApproval
        fields = "__all__"
        # actioned_at replaces the old approved_at field (renamed in migration 0005)

    def get_approver_name(self, obj):
        return _get_employee_full_name(obj.approver)


class CourseRecommendationSerializer(serializers.ModelSerializer):
    training_need_display = serializers.CharField(source="training_need.__str__", read_only=True)

    class Meta:
        model = TrainingNeedCourseRecommendation
        fields = "__all__"


class TNIAggregatedAnalysisSerializer(serializers.ModelSerializer):
    department_name = serializers.CharField(source="department.department_name", read_only=True)

    class Meta:
        model = TNIAggregatedAnalysis
        fields = "__all__"


class GapAnalysisTriggerSerializer(serializers.Serializer):
    """
    Serializer for the action-only endpoint to trigger gap analysis.
    """
    employee_id = serializers.IntegerField(required=False, help_text="Specific employee to analyze.")
    company_id = serializers.IntegerField(required=False, help_text="Analyze all employees in this company.")
