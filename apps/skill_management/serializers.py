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
    CourseSkillMapping
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


class CourseSkillMappingSerializer(serializers.ModelSerializer):
    skill_name = serializers.CharField(source="skill.skill_name", read_only=True)
    target_level_name = serializers.CharField(source="target_level.level_name", read_only=True)

    class Meta:
        model = CourseSkillMapping
        fields = "__all__"
