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
from django.db import transaction
from ..models import CourseSection, CourseLesson, CourseContent


class CourseCategoryService(BaseService):
    repository_class = CourseCategoryRepository

    def get_all_with_counts(self):
        """Business logic hook to retrieve categories with their metrics."""
        return self.repository.get_list_with_counts()


class CourseService(BaseService):
    repository_class = CourseRepository

    def get_complete_visual_path(self, course_id):
        """
        Retrieves the entire hierarchical course structure for student consumption.
        Ensures sections and lessons are correctly ordered.
        """
        return self.repository.get_full_course_structure(course_id)

    @transaction.atomic
    def sync_curriculum_tree(self, course_id, tree_data):
        """
        The "One Big Sync" logic. 
        Synchronizes Sections -> Lessons -> Content in one transaction.
        """
        sections_data = tree_data.get('sections', [])
        
        # 1. Handle SECTIONS
        existing_sections = {s.id: s for s in CourseSection.objects.filter(course_id=course_id)}
        payload_section_ids = {s.get('id') for s in sections_data if s.get('id')}
        
        # Delete sections missing from payload
        for s_id in existing_sections.keys():
            if s_id not in payload_section_ids:
                existing_sections[s_id].delete()

        for s_idx, s_data in enumerate(sections_data):
            s_id = s_data.get('id')
            if s_id and s_id in existing_sections:
                section = existing_sections[s_id]
                section.section_title = s_data['section_title']
                section.display_order = s_idx + 1
                section.save()
            else:
                section = CourseSection.objects.create(
                    course_id=course_id,
                    section_title=s_data['section_title'],
                    display_order=s_idx + 1
                )

            # 2. Handle LESSONS within this section
            lessons_data = s_data.get('lessons', [])
            existing_lessons = {l.id: l for l in CourseLesson.objects.filter(section=section)}
            payload_lesson_ids = {l.get('id') for l in lessons_data if l.get('id')}
            
            for l_id in existing_lessons.keys():
                if l_id not in payload_lesson_ids:
                    existing_lessons[l_id].delete()

            for l_idx, l_data in enumerate(lessons_data):
                l_id = l_data.get('id')
                if l_id and l_id in existing_lessons:
                    lesson = existing_lessons[l_id]
                    lesson.lesson_title = l_data['lesson_title']
                    lesson.estimated_duration_minutes = l_data.get(
                        'estimated_duration_minutes',
                        lesson.estimated_duration_minutes,
                    )
                    lesson.display_order = l_idx + 1
                    lesson.save()
                else:
                    lesson = CourseLesson.objects.create(
                        section=section,
                        lesson_title=l_data['lesson_title'],
                        estimated_duration_minutes=l_data.get('estimated_duration_minutes', 15),
                        display_order=l_idx + 1
                    )

                # 3. Handle CONTENT within this lesson
                contents_data = l_data.get('contents', [])
                existing_contents = {c.id: c for c in CourseContent.objects.filter(lesson=lesson)}
                payload_content_ids = {c.get('id') for c in contents_data if c.get('id')}
                
                for c_id in existing_contents.keys():
                    if c_id not in payload_content_ids:
                        existing_contents[c_id].delete()

                for c_idx, c_data in enumerate(contents_data):
                    c_id = c_data.get('id')
                    if c_id and c_id in existing_contents:
                        content = existing_contents[c_id]
                        content.content_type = c_data['content_type']
                        content.content_url = c_data.get('content_url', '')
                        content.file_ref = c_data.get('file_ref')
                        content.display_order = c_idx + 1
                        content.save()
                    else:
                        CourseContent.objects.create(
                            lesson=lesson,
                            content_type=c_data['content_type'],
                            content_url=c_data.get('content_url', ''),
                            file_ref=c_data.get('file_ref'),
                            display_order=c_idx + 1
                        )
        return True


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
