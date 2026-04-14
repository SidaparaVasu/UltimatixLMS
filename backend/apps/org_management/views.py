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
    Handles standard CRUD with soft-delete support and multi-tenancy.
    """
    service_class = None
    model = None

    def _get_user_company(self):
        """Helper to get the company associated with the logged-in user."""
        try:
            employee = EmployeeMaster.objects.get(user=self.request.user)
            return employee.company
        except EmployeeMaster.DoesNotExist:
            return None

    def get_queryset(self):
        """
        Filter queryset by the user's company.
        If the user is not linked to a company, return empty queryset for security.
        """
        queryset = super().get_queryset()
        
        # If it's the CompanyMasterViewSet, we only show their own company
        if self.model == CompanyMaster:
            company = self._get_user_company()
            return queryset.filter(id=company.id) if company else queryset.none()

        # For JobRole, BusinessUnit, Location (models with direct 'company' FK)
        if hasattr(self.model, 'company'):
            company = self._get_user_company()
            return queryset.filter(company=company) if company else queryset.none()
        
        # For Department (linked via BusinessUnit)
        if self.model == DepartmentMaster:
            company = self._get_user_company()
            return queryset.filter(business_unit__company=company) if company else queryset.none()

        return queryset

    def create(self, request, *args, **kwargs):
        company = self._get_user_company()
        if not company:
            return error_response(
                message="User is not associated with any company. Cannot create record.",
                status_code=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Inject company into validated data for models that have it
        data = serializer.validated_data
        if hasattr(self.model, 'company'):
            data['company'] = company
            
        instance = self.service_class().create(**data)
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
