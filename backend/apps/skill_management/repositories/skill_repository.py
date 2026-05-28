from common.repositories.base import BaseRepository
from ..models import (
    SkillCategoryMaster,
    SkillMaster,
    SkillCategorySkillMap,
    SkillLevelMaster,
    JobRoleSkillRequirement,
    EmployeeSkill,
    EmployeeSkillHistory,
    EmployeeSkillAssessment,
    EmployeeSkillRating,
    EmployeeSkillRatingHistory,
)


class SkillCategoryRepository(BaseRepository[SkillCategoryMaster]):
    model = SkillCategoryMaster


class SkillRepository(BaseRepository[SkillMaster]):
    model = SkillMaster

    def get_children(self, parent_id):
        """Fetch all child skills for a given parent."""
        return self.filter(parent_skill_id=parent_id, is_active=True)


class SkillCategoryMappingRepository(BaseRepository[SkillCategorySkillMap]):
    model = SkillCategorySkillMap


class SkillLevelRepository(BaseRepository[SkillLevelMaster]):
    model = SkillLevelMaster


class JobRoleSkillRepository(BaseRepository[JobRoleSkillRequirement]):
    model = JobRoleSkillRequirement


class EmployeeSkillRepository(BaseRepository[EmployeeSkill]):
    model = EmployeeSkill


class EmployeeSkillHistoryRepository(BaseRepository[EmployeeSkillHistory]):
    model = EmployeeSkillHistory


class EmployeeSkillAssessmentRepository(BaseRepository[EmployeeSkillAssessment]):
    model = EmployeeSkillAssessment


class EmployeeSkillRatingRepository(BaseRepository[EmployeeSkillRating]):
    model = EmployeeSkillRating

    def get_for_employee(self, employee_id, rating_type=None, status=None, is_latest=True):
        """
        Fetch all rating rows for an employee, optionally filtered by
        rating_type (SELF / MANAGER) and/or status (DRAFT / SUBMITTED).
        """
        qs = self.filter(employee_id=employee_id, is_latest=is_latest)
        if rating_type:
            qs = qs.filter(rating_type=rating_type)
        if status:
            qs = qs.filter(status=status)
        return qs

    def get_single(self, employee_id, skill_id, rating_type, is_latest=True):
        """
        Fetch the unique rating row for a given employee-skill-type combination.
        Returns None if not found.
        """
        return self.filter(
            employee_id=employee_id,
            skill_id=skill_id,
            rating_type=rating_type,
            is_latest=is_latest,
        ).first()

    def upsert(self, employee_id, skill_id, rating_type, defaults):
        """
        Create or update the rating row for a given employee-skill-type.
        Returns (instance, created).
        """
        return self.model.objects.update_or_create(
            employee_id=employee_id,
            skill_id=skill_id,
            rating_type=rating_type,
            is_latest=True,
            defaults=defaults,
        )


class EmployeeSkillRatingHistoryRepository(BaseRepository[EmployeeSkillRatingHistory]):
    model = EmployeeSkillRatingHistory

    def get_for_employee(self, employee_id, rating_type=None, skill_id=None):
        """
        Fetch history rows for an employee, optionally filtered by
        rating_type and/or skill.
        """
        qs = self.filter(employee_id=employee_id)
        if rating_type:
            qs = qs.filter(rating_type=rating_type)
        if skill_id:
            qs = qs.filter(skill_id=skill_id)
        return qs.order_by("-changed_at")


