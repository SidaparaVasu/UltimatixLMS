from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CourseCategoryViewSet,
    CourseMasterViewSet,
    TagViewSet,
    CourseTagMapViewSet,
    CourseSectionViewSet,
    CourseLessonViewSet,
    CourseContentViewSet,
    CourseSkillMappingViewSet,
    CourseResourceViewSet,
    CourseDiscussionThreadViewSet,
    CourseDiscussionReplyViewSet,
    CourseParticipantViewSet,
)

router = DefaultRouter()
router.register(r"categories", CourseCategoryViewSet, basename="course_categories")
router.register(r"courses", CourseMasterViewSet, basename="courses")
router.register(r"tags", TagViewSet, basename="course_tags")
router.register(r"tag-mappings", CourseTagMapViewSet, basename="course_tag_mappings")
router.register(r"sections", CourseSectionViewSet, basename="course_sections")
router.register(r"lessons", CourseLessonViewSet, basename="course_lessons")
router.register(r"content", CourseContentViewSet, basename="course_content")
router.register(r"skill-mappings", CourseSkillMappingViewSet, basename="course_skill_mappings")
router.register(r"resources", CourseResourceViewSet, basename="course_resources")
router.register(r"discussion-threads", CourseDiscussionThreadViewSet, basename="course_discussions")
router.register(r"discussion-replies", CourseDiscussionReplyViewSet, basename="course_discussion_replies")
router.register(r"participants", CourseParticipantViewSet, basename="course_participants")

urlpatterns = [
    path("", include(router.urls)),
]
