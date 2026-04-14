from django.db import transaction
from common.services.base import BaseService
from ..repositories import (
    SkillCategoryRepository,
    SkillRepository,
    SkillCategoryMappingRepository,
    SkillLevelRepository,
    JobRoleSkillRepository,
    EmployeeSkillRepository,
    EmployeeSkillHistoryRepository,
    EmployeeSkillAssessmentRepository
)


class SkillCategoryService(BaseService):
    repository_class = SkillCategoryRepository


class SkillService(BaseService):
    repository_class = SkillRepository

    def get_skill_tree(self):
        """Fetch root level skills."""
        return self.repository.filter(parent_skill=None, is_active=True)


class SkillCategoryMappingService(BaseService):
    repository_class = SkillCategoryMappingRepository


class SkillLevelService(BaseService):
    repository_class = SkillLevelRepository


class JobRoleSkillService(BaseService):
    repository_class = JobRoleSkillRepository

    @transaction.atomic
    def bulk_sync_requirements(self, job_role_id, requirements):
        """
        Synchronizes skill requirements for a job role.
        Deactivates current mappings and reactivates/creates new ones.
        """
        # 1. Deactivate all currently active mappings for this role
        self.repository.filter(job_role_id=job_role_id, is_active=True).update(is_active=False)

        results = []
        # 2. Add or Reactivate new ones
        for req in requirements:
            skill_id = req.get('skill_id')
            level_id = req.get('level_id')

            obj, created = self.repository.model.objects.update_or_create(
                job_role_id=job_role_id,
                skill_id=skill_id,
                defaults={'required_level_id': level_id, 'is_active': True}
            )
            results.append(obj)
        
        return results


class EmployeeSkillService(BaseService):
    repository_class = EmployeeSkillRepository


class EmployeeSkillHistoryService(BaseService):
    repository_class = EmployeeSkillHistoryRepository


class EmployeeSkillAssessmentService(BaseService):
    repository_class = EmployeeSkillAssessmentRepository


