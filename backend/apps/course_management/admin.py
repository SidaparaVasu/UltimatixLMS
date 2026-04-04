from django.contrib import admin
from .models import (
    CourseCategoryMaster,
    CourseMaster,
    TagMaster,
    CourseTagMap,
    CourseSkillMapping,
    CourseSection,
    CourseLesson,
    CourseContent,
    CourseResource,
    CourseDiscussionThread,
    CourseDiscussionReply
)


class CourseSectionInline(admin.StackedInline):
    model = CourseSection
    extra = 1


class CourseSkillMappingInline(admin.TabularInline):
    model = CourseSkillMapping
    extra = 1


class CourseTagMapInline(admin.TabularInline):
    model = CourseTagMap
    extra = 1


@admin.register(CourseCategoryMaster)
class CourseCategoryAdmin(admin.ModelAdmin):
    list_display = ("category_name", "category_code", "is_active", "created_at")
    search_fields = ("category_name", "category_code")


@admin.register(CourseMaster)
class CourseMasterAdmin(admin.ModelAdmin):
    list_display = ("course_title", "course_code", "category", "difficulty_level", "is_active")
    list_filter = ("difficulty_level", "category", "is_active")
    search_fields = ("course_title", "course_code", "description")
    inlines = [CourseTagMapInline, CourseSkillMappingInline, CourseSectionInline]
    autocomplete_fields = ["category", "created_by"]


@admin.register(TagMaster)
class TagAdmin(admin.ModelAdmin):
    list_display = ("tag_name", "description", "created_at")
    search_fields = ("tag_name",)


@admin.register(CourseSection)
class CourseSectionAdmin(admin.ModelAdmin):
    list_display = ("section_title", "course", "display_order")
    list_filter = ("course",)
    search_fields = ("section_title", "course__course_title")


@admin.register(CourseLesson)
class CourseLessonAdmin(admin.ModelAdmin):
    list_display = ("lesson_title", "section", "display_order", "estimated_duration_minutes")
    list_filter = ("section__course",)
    search_fields = ("lesson_title", "section__section_title")


@admin.register(CourseContent)
class CourseContentAdmin(admin.ModelAdmin):
    list_display = ("lesson", "content_type", "display_order")
    list_filter = ("content_type",)


@admin.register(CourseResource)
class CourseResourceAdmin(admin.ModelAdmin):
    list_display = ("resource_title", "course", "created_at")
    search_fields = ("resource_title", "course__course_title")


class CourseDiscussionReplyInline(admin.TabularInline):
    model = CourseDiscussionReply
    extra = 1


@admin.register(CourseDiscussionThread)
class CourseDiscussionThreadAdmin(admin.ModelAdmin):
    list_display = ("thread_title", "course", "created_by", "created_at")
    list_filter = ("course", "created_at")
    search_fields = ("thread_title", "created_by__employee_code")
    inlines = [CourseDiscussionReplyInline]
