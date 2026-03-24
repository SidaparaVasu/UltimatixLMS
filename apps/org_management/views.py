from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiParameter
from common.response import success_response, created_response, error_response
from .models import (
    CompanyMaster,
    BusinessUnitMaster,
    DepartmentMaster,
    LocationMaster,
    JobRoleMaster,
    EmployeeMaster,
    EmployeeReportingManager
)
from .serializers import (
    CompanyMasterSerializer,
    BusinessUnitMasterSerializer,
    DepartmentMasterSerializer,
    LocationMasterSerializer,
    JobRoleMasterSerializer,
    EmployeeMasterSerializer,
    EmployeeReportingManagerSerializer
)
from .services import (
    CompanyService,
    BusinessUnitService,
    DepartmentService,
    LocationService,
    JobRoleService,
    EmployeeService,
    ReportingManagerService
)


class BaseOrgViewSet(viewsets.ModelViewSet):
    """
    Base viewset for all organization mapping modules.
    Handles standard CRUD with soft-delete support.
    """
    service_class = None

    def get_serializer_context(self):
        context = super().get_serializer_context()
        return context

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
            message=f"{self.model.__name__} created successfully.",
            data=self.get_serializer(instance).data
        )

    def update(self, request, *args, **kwargs):
        """Full update (PUT)."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        updated_instance = self.service_class().update(pk=instance.pk, partial=False, **serializer.validated_data)
        return success_response(
            message=f"{self.model.__name__} updated successfully.",
            data=self.get_serializer(updated_instance).data
        )

    def partial_update(self, request, *args, **kwargs):
        """Partial update (PATCH)."""
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        updated_instance = self.service_class().update(pk=instance.pk, partial=True, **serializer.validated_data)
        return success_response(
            message=f"{self.model.__name__} partially updated successfully.",
            data=self.get_serializer(updated_instance).data
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
        
        msg = f"{self.model.__name__} {'soft-deleted' if soft_delete else 'hard-deleted'} successfully."
        return success_response(message=msg)


class CompanyMasterViewSet(BaseOrgViewSet):
    queryset = CompanyMaster.objects.all()
    serializer_class = CompanyMasterSerializer
    service_class = CompanyService
    model = CompanyMaster


class BusinessUnitMasterViewSet(BaseOrgViewSet):
    queryset = BusinessUnitMaster.objects.all()
    serializer_class = BusinessUnitMasterSerializer
    service_class = BusinessUnitService
    model = BusinessUnitMaster


class DepartmentMasterViewSet(BaseOrgViewSet):
    queryset = DepartmentMaster.objects.all()
    serializer_class = DepartmentMasterSerializer
    service_class = DepartmentService
    model = DepartmentMaster


class LocationMasterViewSet(BaseOrgViewSet):
    queryset = LocationMaster.objects.all()
    serializer_class = LocationMasterSerializer
    service_class = LocationService
    model = LocationMaster


class JobRoleMasterViewSet(BaseOrgViewSet):
    queryset = JobRoleMaster.objects.all()
    serializer_class = JobRoleMasterSerializer
    service_class = JobRoleService
    model = JobRoleMaster


class EmployeeMasterViewSet(BaseOrgViewSet):
    queryset = EmployeeMaster.objects.all()
    serializer_class = EmployeeMasterSerializer
    service_class = EmployeeService
    model = EmployeeMaster

    def destroy(self, request, *args, **kwargs):
        return error_response(
            message="Deletion not allowed for EmployeeMaster records.",
            status_code=status.HTTP_403_FORBIDDEN
        )


class EmployeeReportingManagerViewSet(BaseOrgViewSet):
    queryset = EmployeeReportingManager.objects.all()
    serializer_class = EmployeeReportingManagerSerializer
    service_class = ReportingManagerService
    model = EmployeeReportingManager

    def destroy(self, request, *args, **kwargs):
        return error_response(
            message="Deletion not allowed for EmployeeReportingManager records.",
            status_code=status.HTTP_403_FORBIDDEN
        )
