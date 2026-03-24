from rest_framework import serializers
from .models import (
    CompanyMaster,
    BusinessUnitMaster,
    DepartmentMaster,
    LocationMaster,
    JobRoleMaster,
    EmployeeMaster,
    EmployeeReportingManager
)


class CompanyMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanyMaster
        fields = ["id", "company_name", "company_code", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class BusinessUnitMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = BusinessUnitMaster
        fields = ["id", "company", "business_unit_name", "business_unit_code", "description", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class DepartmentMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = DepartmentMaster
        fields = ["id", "business_unit", "department_name", "department_code", "description", "parent_department", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class LocationMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = LocationMaster
        fields = ["id", "company", "location_name", "location_code", "address", "city", "state", "country", "postal_code", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class JobRoleMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = JobRoleMaster
        fields = ["id", "job_role_name", "job_role_code", "description", "is_active", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class EmployeeMasterSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeMaster
        fields = ["id", "user", "employee_code", "company", "business_unit", "department", "job_role", "location", "joining_date", "employment_status", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class EmployeeReportingManagerSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmployeeReportingManager
        fields = ["id", "employee", "manager", "relationship_type", "created_at"]
        read_only_fields = ["id", "created_at"]
