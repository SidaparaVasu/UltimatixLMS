from django.contrib import admin
from .models import (
    AssessmentMaster, QuestionBank, QuestionOption, 
    AssessmentQuestionMapping, AssessmentAttempt, 
    UserAnswer, AssessmentResult
)


class QuestionOptionInline(admin.TabularInline):
    model = QuestionOption
    extra = 4
    fields = ("option_text", "is_correct", "display_order")


class AssessmentQuestionMappingInline(admin.TabularInline):
    model = AssessmentQuestionMapping
    extra = 1
    autocomplete_fields = ["question"]


@admin.register(QuestionBank)
class QuestionBankAdmin(admin.ModelAdmin):
    list_display = ("id", "question_text_short", "question_type", "difficulty_complexity", "is_active")
    list_filter = ("question_type", "difficulty_complexity", "is_active")
    search_fields = ("question_text", "scenario_text")
    inlines = [QuestionOptionInline]
    
    def question_text_short(self, obj):
        return obj.question_text[:100]
    question_text_short.short_description = "Question"


@admin.register(AssessmentMaster)
class AssessmentMasterAdmin(admin.ModelAdmin):
    list_display = ("title", "course", "duration_minutes", "passing_percentage", "status")
    list_filter = ("status", "course")
    search_fields = ("title", "description")
    inlines = [AssessmentQuestionMappingInline]
    ordering = ("-created_at",)


class UserAnswerInline(admin.TabularInline):
    model = UserAnswer
    extra = 0
    readonly_fields = ("question", "selected_option", "answer_text", "uploaded_file", "is_auto_graded", "earned_points")
    can_delete = False


@admin.register(AssessmentAttempt)
class AssessmentAttemptAdmin(admin.ModelAdmin):
    list_display = ("id", "employee", "assessment", "status", "started_at", "submitted_at")
    list_filter = ("status", "assessment")
    search_fields = ("employee__employee_code", "assessment__title")
    inlines = [UserAnswerInline]
    readonly_fields = ("id", "started_at", "expires_at")


@admin.register(AssessmentResult)
class AssessmentResultAdmin(admin.ModelAdmin):
    list_display = ("attempt", "score_percentage", "status", "grading_type", "graded_at")
    list_filter = ("status", "grading_type")
    search_fields = ("attempt__employee__employee_code", "attempt__assessment__title")
    readonly_fields = ("total_score", "score_percentage", "graded_at")
