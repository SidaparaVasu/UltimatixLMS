from django.contrib import admin
from .models import (
    TrainingNeed,
    SkillGapSnapshot,
    ComplianceTrainingRequirement,
    TrainingNeedApproval,
    TrainingNeedCourseRecommendation,
    TNIAggregatedAnalysis
)


@admin.register(TrainingNeed)
class TrainingNeedAdmin(admin.ModelAdmin):
    list_display = ("employee", "skill", "source_type", "priority", "status", "identified_at")
    list_filter = ("status", "priority", "source_type", "is_active")
    search_fields = ("employee__employee_code", "skill__skill_name", "notes")
    autocomplete_fields = ["employee", "skill"]
    readonly_fields = ("identified_at", "created_at", "updated_at")


@admin.register(SkillGapSnapshot)
class SkillGapSnapshotAdmin(admin.ModelAdmin):
    list_display = ("employee", "skill", "required_level", "current_level", "gap_value", "detected_at")
    list_filter = ("detected_at", "is_active")
    search_fields = ("employee__employee_code", "skill__skill_name")
    readonly_fields = ("employee", "skill", "required_level", "current_level", "gap_value", "detected_at")


@admin.register(ComplianceTrainingRequirement)
class ComplianceRequirementAdmin(admin.ModelAdmin):
    list_display = ("job_role", "course_id", "mandatory", "validity_days", "is_active")
    list_filter = ("mandatory", "is_active")
    search_fields = ("job_role__job_role_name", "course_id")


@admin.register(TrainingNeedApproval)
class TrainingNeedApprovalAdmin(admin.ModelAdmin):
    list_display = ("training_need", "approver", "approval_status", "approved_at")
    list_filter = ("approval_status", "approved_at")
    search_fields = ("training_need__employee__employee_code", "approver__employee_code")


@admin.register(TrainingNeedCourseRecommendation)
class CourseRecommendationAdmin(admin.ModelAdmin):
    list_display = ("training_need", "course_id", "created_at")
    search_fields = ("training_need__employee__employee_code", "course_id")


@admin.register(TNIAggregatedAnalysis)
class TNIAnalysisAdmin(admin.ModelAdmin):
    list_display = ("department", "total_training_needs", "high_priority_needs", "generated_at")
    list_filter = ("generated_at", "department")
    readonly_fields = ("department", "total_training_needs", "high_priority_needs", "generated_at")
