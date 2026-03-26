from rest_framework import viewsets, status
from drf_spectacular.utils import extend_schema, OpenApiParameter
from common.response import success_response, created_response, error_response
from apps.rbac.permissions import HasScopedPermission
from .models import (
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
from .serializers import (
    SkillCategorySerializer,
    SkillMasterSerializer,
    SkillCategoryMappingSerializer,
    SkillLevelSerializer,
    SkillDetailSerializer,
    JobRoleSkillRequirementSerializer,
    EmployeeSkillSerializer,
    EmployeeSkillHistorySerializer,
    EmployeeSkillAssessmentSerializer,
    CourseSkillMappingSerializer
)
from .services import (
    SkillCategoryService,
    SkillService,
    SkillCategoryMappingService,
    SkillLevelService,
    JobRoleSkillService,
    EmployeeSkillService,
    EmployeeSkillHistoryService,
    EmployeeSkillAssessmentService,
    CourseSkillMappingService
)


class BaseSkillViewSet(viewsets.ModelViewSet):
    """
    Standardizes CRUD response logic for the Skill Management module.
    """
    service_class = None
    model = None
    permission_classes = [HasScopedPermission]

    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        page = self.paginate_queryset(queryset)
        if page is not None:
             serializer = self.get_serializer(page, many=True)
             return self.get_paginated_response(serializer.data)
        serializer = self.get_serializer(queryset, many=True)
        return success_response(data=serializer.data)

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(data=serializer.data)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        instance = self.service_class().create(**serializer.validated_data)
        return created_response(
            message=f"{self.model._meta.verbose_name} created successfully.",
            data=self.get_serializer(instance).data
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        updated = self.service_class().update(pk=instance.pk, partial=False, **serializer.validated_data)
        return success_response(
            message=f"{self.model._meta.verbose_name} updated successfully.",
            data=self.get_serializer(updated).data
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated = self.service_class().update(pk=instance.pk, partial=True, **serializer.validated_data)
        return success_response(
            message=f"{self.model._meta.verbose_name} partially updated successfully.",
            data=self.get_serializer(updated).data
        )

    @extend_schema(
        parameters=[
            OpenApiParameter(name="soft_delete", type=bool, description="Set to false for hard delete (default is true)")
        ]
    )
    def destroy(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        soft_delete = request.query_params.get("soft_delete", "true").lower() == "true"
        self.service_class().delete(pk=pk, soft_delete=soft_delete)
        msg = f"{self.model._meta.verbose_name} deleted successfully."
        return success_response(message=msg)


class SkillCategoryViewSet(BaseSkillViewSet):
    queryset = SkillCategoryMaster.objects.all()
    serializer_class = SkillCategorySerializer
    service_class = SkillCategoryService
    model = SkillCategoryMaster
    required_permission = "SKILL_CATEGORY_MANAGE"


class SkillMasterViewSet(BaseSkillViewSet):
    queryset = SkillMaster.objects.all()
    serializer_class = SkillMasterSerializer
    service_class = SkillService
    model = SkillMaster
    required_permission = "SKILL_MANAGE"

    def get_serializer_class(self):
        if self.action == "retrieve":
            return SkillDetailSerializer
        return SkillMasterSerializer


class SkillCategoryMappingViewSet(BaseSkillViewSet):
    queryset = SkillCategorySkillMap.objects.all()
    serializer_class = SkillCategoryMappingSerializer
    service_class = SkillCategoryMappingService
    model = SkillCategorySkillMap
    required_permission = "SKILL_MAPPING_MANAGE"


class SkillLevelViewSet(BaseSkillViewSet):
    queryset = SkillLevelMaster.objects.all()
    serializer_class = SkillLevelSerializer
    service_class = SkillLevelService
    model = SkillLevelMaster
    required_permission = "SKILL_LEVEL_MANAGE"


class JobRoleSkillRequirementViewSet(BaseSkillViewSet):
    queryset = JobRoleSkillRequirement.objects.all()
    serializer_class = JobRoleSkillRequirementSerializer
    service_class = JobRoleSkillService
    model = JobRoleSkillRequirement
    required_permission = "ROLE_COMPETENCY_MANAGE"


class EmployeeSkillViewSet(BaseSkillViewSet):
    queryset = EmployeeSkill.objects.all()
    serializer_class = EmployeeSkillSerializer
    service_class = EmployeeSkillService
    model = EmployeeSkill
    required_permission = "EMPLOYEE_SKILL_MANAGE"


class EmployeeSkillHistoryViewSet(BaseSkillViewSet):
    """
    History is read-only for employees/managers, usually generated via signals.
    """
    queryset = EmployeeSkillHistory.objects.all()
    serializer_class = EmployeeSkillHistorySerializer
    service_class = EmployeeSkillHistoryService
    model = EmployeeSkillHistory
    required_permission = "EMPLOYEE_SKILL_HISTORY_VIEW"
    http_method_names = ["get"]


class EmployeeSkillAssessmentViewSet(BaseSkillViewSet):
    queryset = EmployeeSkillAssessment.objects.all()
    serializer_class = EmployeeSkillAssessmentSerializer
    service_class = EmployeeSkillAssessmentService
    model = EmployeeSkillAssessment
    required_permission = "SKILL_ASSESSMENT_MANAGE"


class CourseSkillMappingViewSet(BaseSkillViewSet):
    queryset = CourseSkillMapping.objects.all()
    serializer_class = CourseSkillMappingSerializer
    service_class = CourseSkillMappingService
    model = CourseSkillMapping
    required_permission = "COURSE_SKILL_MANAGE"
