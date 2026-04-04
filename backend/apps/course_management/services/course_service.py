from common.services.base import BaseService
from ..repositories import (
    CourseCategoryRepository,
    CourseRepository,
    TagRepository,
    CourseTagMapRepository,
    CourseSkillMappingRepository,
    CourseSectionRepository,
    CourseLessonRepository,
    CourseContentRepository,
    CourseResourceRepository,
    CourseDiscussionThreadRepository,
    CourseDiscussionReplyRepository
)


class CourseCategoryService(BaseService):
    repository_class = CourseCategoryRepository


class CourseService(BaseService):
    repository_class = CourseRepository

    def get_complete_visual_path(self, course_id):
        """
        Retrieves the entire hierarchical course structure for student consumption.
        Ensures sections and lessons are correctly ordered.
        """
        return self.repository.get_full_course_structure(course_id)


class TagService(BaseService):
    repository_class = TagRepository


class CourseTagMapService(BaseService):
    repository_class = CourseTagMapRepository


class CourseSkillMappingService(BaseService):
    """
    Service layer previously in skill_management. 
    Handles assigning learning outcomes to courses.
    """
    repository_class = CourseSkillMappingRepository


class CourseSectionService(BaseService):
    repository_class = CourseSectionRepository


class CourseLessonService(BaseService):
    repository_class = CourseLessonRepository


class CourseContentService(BaseService):
    repository_class = CourseContentRepository


class CourseResourceService(BaseService):
    repository_class = CourseResourceRepository


class CourseDiscussionThreadService(BaseService):
    repository_class = CourseDiscussionThreadRepository


class CourseDiscussionReplyService(BaseService):
    repository_class = CourseDiscussionReplyRepository
