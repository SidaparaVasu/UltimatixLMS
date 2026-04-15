from rest_framework import viewsets, status
from rest_framework.decorators import action
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
    BusinessUnitOptionSerializer,
    DepartmentMasterSerializer,
    DepartmentOptionSerializer,
    LocationMasterSerializer,
    LocationOptionSerializer,
    JobRoleMasterSerializer,
    JobRoleOptionSerializer,
    EmployeeDirectorySerializer,
    EmployeeFullProfileWriteSerializer,
    EmployeeManagerOptionSerializer,
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
        employee = EmployeeService().get_by_user(self.request.user)
        return employee.company if employee else None

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

    @action(detail=False, methods=["get"], url_path="options")
    def options(self, request):
        company = self._get_user_company()
        if not company:
            return success_response(data=[])

        business_units = self.service_class().get_dropdown_options(company=company)
        serializer = BusinessUnitOptionSerializer(business_units, many=True)
        return success_response(
            message="Business unit options retrieved successfully.",
            data=serializer.data,
        )


class DepartmentMasterViewSet(BaseOrgViewSet):
    queryset = DepartmentMaster.objects.all()
    serializer_class = DepartmentMasterSerializer
    service_class = DepartmentService
    model = DepartmentMaster

    @extend_schema(
        parameters=[
            OpenApiParameter(
                name="business_unit_id",
                type=int,
                description="Optional business unit filter for department dropdown options.",
            )
        ]
    )
    @action(detail=False, methods=["get"], url_path="options")
    def options(self, request):
        company = self._get_user_company()
        if not company:
            return success_response(data=[])

        business_unit_id = request.query_params.get("business_unit_id")
        try:
            business_unit_id = int(business_unit_id) if business_unit_id else None
        except (TypeError, ValueError):
            return error_response(
                message="business_unit_id must be an integer.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        departments = self.service_class().get_dropdown_options(
            company=company,
            business_unit_id=business_unit_id,
        )
        serializer = DepartmentOptionSerializer(departments, many=True)
        return success_response(
            message="Department options retrieved successfully.",
            data=serializer.data,
        )


class LocationMasterViewSet(BaseOrgViewSet):
    queryset = LocationMaster.objects.all()
    serializer_class = LocationMasterSerializer
    service_class = LocationService
    model = LocationMaster

    @action(detail=False, methods=["get"], url_path="options")
    def options(self, request):
        company = self._get_user_company()
        if not company:
            return success_response(data=[])

        locations = self.service_class().get_dropdown_options(company=company)
        serializer = LocationOptionSerializer(locations, many=True)
        return success_response(
            message="Location options retrieved successfully.",
            data=serializer.data,
        )


class JobRoleMasterViewSet(BaseOrgViewSet):
    queryset = JobRoleMaster.objects.all()
    serializer_class = JobRoleMasterSerializer
    service_class = JobRoleService
    model = JobRoleMaster

    @action(detail=False, methods=["get"], url_path="options")
    def options(self, request):
        company = self._get_user_company()
        if not company:
            return success_response(data=[])

        job_roles = self.service_class().get_dropdown_options(company=company)
        serializer = JobRoleOptionSerializer(job_roles, many=True)
        return success_response(
            message="Job role options retrieved successfully.",
            data=serializer.data,
        )


class EmployeeMasterViewSet(BaseOrgViewSet):
    queryset = EmployeeMaster.objects.all()
    serializer_class = EmployeeDirectorySerializer
    service_class = EmployeeService
    model = EmployeeMaster

    def get_queryset(self):
        company = self._get_user_company()
        if not company:
            return EmployeeMaster.objects.none()
        return self.service_class().get_directory_queryset(company=company)

    def get_serializer_class(self):
        if self.action in {"create", "update", "partial_update"}:
            return EmployeeFullProfileWriteSerializer
        if self.action == "manager_options":
            return EmployeeManagerOptionSerializer
        return EmployeeDirectorySerializer

    def create(self, request, *args, **kwargs):
        company = self._get_user_company()
        if not company:
            return error_response(
                message="User is not associated with any company. Cannot create record.",
                status_code=status.HTTP_403_FORBIDDEN
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        employee = self.service_class().create_full_profile(
            company=company,
            **serializer.validated_data,
        )
        return created_response(
            message="Employee profile created successfully.",
            data=EmployeeDirectorySerializer(employee).data,
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data)
        serializer.is_valid(raise_exception=True)
        employee = self.service_class().update_full_profile(
            employee=instance,
            **serializer.validated_data,
        )
        return success_response(
            message="Employee profile updated successfully.",
            data=EmployeeDirectorySerializer(employee).data,
        )

    def partial_update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        employee = self.service_class().update_full_profile(
            employee=instance,
            **serializer.validated_data,
        )
        return success_response(
            message="Employee profile partially updated successfully.",
            data=EmployeeDirectorySerializer(employee).data,
        )

    @extend_schema(
        parameters=[
            OpenApiParameter(name="soft_delete", type=bool, description="Set to true to deactivate the employee record.")
        ]
    )
    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        soft_delete = request.query_params.get("soft_delete", "true").lower() == "true"
        self.service_class().delete(pk=instance.pk, soft_delete=soft_delete)
        return success_response(message="Employee profile deactivated successfully.")

    @action(detail=False, methods=["get"], url_path="manager-options")
    def manager_options(self, request):
        company = self._get_user_company()
        if not company:
            return success_response(data=[])

        exclude_employee_id = request.query_params.get("exclude_employee_id")
        try:
            exclude_employee_id = int(exclude_employee_id) if exclude_employee_id else None
        except (TypeError, ValueError):
            return error_response(
                message="exclude_employee_id must be an integer.",
                status_code=status.HTTP_400_BAD_REQUEST,
            )

        employees = self.service_class().get_manager_options(
            company=company,
            exclude_employee_id=exclude_employee_id,
        )
        serializer = self.get_serializer(employees, many=True)
        return success_response(
            message="Manager options retrieved successfully.",
            data=serializer.data,
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
