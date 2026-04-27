from common.repositories.base import BaseRepository
from ..models import (
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
    CourseDiscussionReply,
    CourseParticipant,
)
from django.db.models import Count


class CourseCategoryRepository(BaseRepository[CourseCategoryMaster]):
    model = CourseCategoryMaster

    def get_list_with_counts(self):
        """Fetches all categories annotated with the count of linked courses."""
        return self.model.objects.annotate(course_count=Count('courses'))


class CourseRepository(BaseRepository[CourseMaster]):
    model = CourseMaster

    def get_full_course_structure(self, course_id):
        """
        Retrieves a course with its complete hierarchy (Sections > Lessons > Content).
        Use select_related/prefetch_related to optimize performance.
        """
        return self.model.objects.filter(id=course_id).prefetch_related(
            "sections", 
            "sections__lessons", 
            "sections__lessons__contents",
            "tags__tag",
            "skilled_outcomes__skill"
        ).first()


class TagRepository(BaseRepository[TagMaster]):
    model = TagMaster


class CourseTagMapRepository(BaseRepository[CourseTagMap]):
    model = CourseTagMap


class CourseSkillMappingRepository(BaseRepository[CourseSkillMapping]):
    model = CourseSkillMapping


class CourseSectionRepository(BaseRepository[CourseSection]):
    model = CourseSection


class CourseLessonRepository(BaseRepository[CourseLesson]):
    model = CourseLesson


class CourseContentRepository(BaseRepository[CourseContent]):
    model = CourseContent


class CourseResourceRepository(BaseRepository[CourseResource]):
    model = CourseResource


class CourseDiscussionThreadRepository(BaseRepository[CourseDiscussionThread]):
    model = CourseDiscussionThread


class CourseDiscussionReplyRepository(BaseRepository[CourseDiscussionReply]):
    model = CourseDiscussionReply


class CourseParticipantRepository(BaseRepository[CourseParticipant]):
    model = CourseParticipant

    def bulk_get_or_create(self, course, employee_ids, invited_by=None):
        """
        Creates CourseParticipant rows for each employee_id that doesn't already exist.
        Returns (created_count, skipped_count).
        """
        existing_ids = set(
            self.model.objects.filter(course=course, employee_id__in=employee_ids)
            .values_list("employee_id", flat=True)
        )
        new_ids = [eid for eid in employee_ids if eid not in existing_ids]
        if new_ids:
            self.model.objects.bulk_create([
                self.model(course=course, employee_id=eid, invited_by=invited_by)
                for eid in new_ids
            ])
        return len(new_ids), len(employee_ids) - len(new_ids)
