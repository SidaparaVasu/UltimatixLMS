from django.contrib import admin
from .models import (
    LearningPathMaster, 
    LearningPathCourseMap, 
    UserCourseEnrollment, 
    UserLessonProgress, 
    UserContentProgress, 
    CourseCertificate,
    UserSCORMProgress
)


class LearningPathCourseMapInline(admin.TabularInline):
    model = LearningPathCourseMap
    extra = 1


@admin.register(LearningPathMaster)
class LearningPathMasterAdmin(admin.ModelAdmin):
    list_display = ["path_name", "path_code", "is_active", "created_at"]
    search_fields = ["path_name", "path_code"]
    inlines = [LearningPathCourseMapInline]


class UserLessonProgressInline(admin.TabularInline):
    model = UserLessonProgress
    extra = 0
    readonly_fields = ["lesson", "status", "completed_at"]


@admin.register(UserCourseEnrollment)
class UserCourseEnrollmentAdmin(admin.ModelAdmin):
    list_display = ["employee", "course", "status", "progress_percentage", "enrolled_at"]
    list_filter = ["status", "enrollment_type"]
    search_fields = ["employee__employee_code", "course__course_title"]
    inlines = [UserLessonProgressInline]


@admin.register(UserLessonProgress)
class UserLessonProgressAdmin(admin.ModelAdmin):
    list_display = ["enrollment", "lesson", "status", "completed_at"]
    list_filter = ["status"]


@admin.register(UserContentProgress)
class UserContentProgressAdmin(admin.ModelAdmin):
    list_display = ["lesson_progress", "content", "playhead_seconds", "is_completed"]


@admin.register(CourseCertificate)
class CourseCertificateAdmin(admin.ModelAdmin):
    list_display = ["certificate_number", "enrollment", "issued_at"]
    search_fields = ["certificate_number", "verification_code"]


@admin.register(UserSCORMProgress)
class UserSCORMProgressAdmin(admin.ModelAdmin):
    list_display = ["enrollment", "lesson", "content", "lesson_status", "score_raw", "last_accessed_at"]
    list_filter = ["lesson_status", "success_status", "last_accessed_at"]
    search_fields = ["enrollment__employee__employee_code", "lesson__lesson_title"]
    readonly_fields = ["first_accessed_at", "last_accessed_at"]

