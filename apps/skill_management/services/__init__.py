from ..models import (
    SkillCategoryMaster,
    SkillMaster,
    SkillCategorySkillMap,
    SkillLevelMaster,
    JobRoleSkillRequirement,
    EmployeeSkill,
    EmployeeSkillHistory,
    EmployeeSkillAssessment,
    CourseSkillMapping
)
from .base_service import BaseSkillService


class SkillCategoryService(BaseSkillService):
    model = SkillCategoryMaster


class SkillService(BaseSkillService):
    model = SkillMaster
    
    def get_skill_tree(self):
        # Additional custom method to fetch recursive tree if needed
        return self.model.objects.filter(parent_skill=None, is_active=True)


class SkillCategoryMappingService(BaseSkillService):
    model = SkillCategorySkillMap


class SkillLevelService(BaseSkillService):
    model = SkillLevelMaster


class JobRoleSkillService(BaseSkillService):
    model = JobRoleSkillRequirement


class EmployeeSkillService(BaseSkillService):
    model = EmployeeSkill


class EmployeeSkillHistoryService(BaseSkillService):
    model = EmployeeSkillHistory


class EmployeeSkillAssessmentService(BaseSkillService):
    model = EmployeeSkillAssessment


class CourseSkillMappingService(BaseSkillService):
    model = CourseSkillMapping
