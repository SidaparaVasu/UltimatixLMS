from rest_framework import serializers
from .models import (
    TrainingNeed,
    SkillGapSnapshot,
    ComplianceTrainingRequirement,
    TrainingNeedApproval,
    TrainingNeedCourseRecommendation,
    TNIAggregatedAnalysis
)


class TrainingNeedSerializer(serializers.ModelSerializer):
    employee_code = serializers.CharField(source="employee.employee_code", read_only=True)
    employee_name = serializers.CharField(source="employee.user.get_full_name", read_only=True)
    skill_name = serializers.CharField(source="skill.skill_name", read_only=True)

    class Meta:
        model = TrainingNeed
        fields = "__all__"


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
    approver_name = serializers.CharField(source="approver.user.get_full_name", read_only=True)
    training_need_display = serializers.CharField(source="training_need.__str__", read_only=True)

    class Meta:
        model = TrainingNeedApproval
        fields = "__all__"


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
