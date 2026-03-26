from django.contrib import admin
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


@admin.register(SkillCategoryMaster)
class SkillCategoryAdmin(admin.ModelAdmin):
    list_display = ("category_name", "category_code", "is_active", "created_at")
    search_fields = ("category_name", "category_code")
    list_filter = ("is_active",)


@admin.register(SkillMaster)
class SkillMasterAdmin(admin.ModelAdmin):
    list_display = ("skill_name", "skill_code", "parent_skill", "is_active", "created_at")
    search_fields = ("skill_name", "skill_code")
    list_filter = ("is_active", "parent_skill")
    autocomplete_fields = ["parent_skill"]


@admin.register(SkillCategorySkillMap)
class SkillCategoryMappingAdmin(admin.ModelAdmin):
    list_display = ("skill", "category", "is_active", "created_at")
    search_fields = ("skill__skill_name", "category__category_name")
    list_filter = ("is_active", "category")


@admin.register(SkillLevelMaster)
class SkillLevelAdmin(admin.ModelAdmin):
    list_display = ("level_name", "level_rank", "is_active", "created_at")
    search_fields = ("level_name",)
    list_filter = ("is_active",)
    ordering = ("level_rank",)


@admin.register(JobRoleSkillRequirement)
class JobRoleSkillRequirementAdmin(admin.ModelAdmin):
    list_display = ("job_role", "skill", "required_level", "is_active", "created_at")
    search_fields = ("job_role__job_role_name", "skill__skill_name")
    list_filter = ("is_active", "job_role", "required_level")


@admin.register(EmployeeSkill)
class EmployeeSkillAdmin(admin.ModelAdmin):
    list_display = ("employee", "skill", "current_level", "is_active", "updated_at")
    search_fields = ("employee__employee_code", "skill__skill_name")
    list_filter = ("is_active", "skill", "current_level")


@admin.register(EmployeeSkillHistory)
class EmployeeSkillHistoryAdmin(admin.ModelAdmin):
    list_display = ("employee", "skill", "old_level", "new_level", "changed_at")
    search_fields = ("employee__employee_code", "skill__skill_name")
    list_filter = ("skill", "changed_at")
    readonly_fields = ("employee", "skill", "old_level", "new_level", "changed_at", "remarks")


@admin.register(EmployeeSkillAssessment)
class EmployeeSkillAssessmentAdmin(admin.ModelAdmin):
    list_display = ("employee", "skill", "score", "result_level", "assessed_at")
    search_fields = ("employee__employee_code", "skill__skill_name")
    list_filter = ("result_level", "assessed_at")


@admin.register(CourseSkillMapping)
class CourseSkillMappingAdmin(admin.ModelAdmin):
    list_display = ("course_id", "skill", "target_level", "created_at")
    search_fields = ("skill__skill_name",)
    list_filter = ("target_level", "created_at")
