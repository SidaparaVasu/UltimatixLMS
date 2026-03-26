from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    SkillCategoryViewSet,
    SkillMasterViewSet,
    SkillCategoryMappingViewSet,
    SkillLevelViewSet,
    JobRoleSkillRequirementViewSet,
    EmployeeSkillViewSet,
    EmployeeSkillHistoryViewSet,
    EmployeeSkillAssessmentViewSet,
    CourseSkillMappingViewSet
)

router = DefaultRouter()
router.register("skill-categories", SkillCategoryViewSet, basename="skill-categories")
router.register("skills", SkillMasterViewSet, basename="skills")
router.register("skill-mappings", SkillCategoryMappingViewSet, basename="skill-mappings")
router.register("skill-levels", SkillLevelViewSet, basename="skill-levels")
router.register("role-requirements", JobRoleSkillRequirementViewSet, basename="role-requirements")
router.register("employee-skills", EmployeeSkillViewSet, basename="employee-skills")
router.register("employee-skill-history", EmployeeSkillHistoryViewSet, basename="employee-skill-history")
router.register("skill-assessments", EmployeeSkillAssessmentViewSet, basename="skill-assessments")
router.register("course-skill-mappings", CourseSkillMappingViewSet, basename="course-skill-mappings")

urlpatterns = [
    path("", include(router.urls)),
]
