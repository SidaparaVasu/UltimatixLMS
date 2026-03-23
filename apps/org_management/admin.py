from django.contrib import admin
from .models import (
    CompanyMaster, BusinessUnitMaster, DepartmentMaster,
    LocationMaster, JobRoleMaster, EmployeeMaster, EmployeeReportingManager
)

@admin.register(CompanyMaster)
class CompanyMasterAdmin(admin.ModelAdmin):
    list_display = ["id", "company_name", "company_code", "is_active", "created_at"]
    search_fields = ["company_name", "company_code"]


@admin.register(BusinessUnitMaster)
class BusinessUnitMasterAdmin(admin.ModelAdmin):
    list_display = ["id", "business_unit_name", "business_unit_code", "company", "is_active"]
    list_filter = ["company", "is_active"]
    search_fields = ["business_unit_name", "business_unit_code"]


@admin.register(DepartmentMaster)
class DepartmentMasterAdmin(admin.ModelAdmin):
    list_display = ["id", "department_name", "department_code", "business_unit", "parent_department", "is_active"]
    list_filter = ["business_unit", "is_active"]
    search_fields = ["department_name", "department_code"]


@admin.register(LocationMaster)
class LocationMasterAdmin(admin.ModelAdmin):
    list_display = ["id", "location_name", "location_code", "company", "city", "is_active"]
    list_filter = ["company", "is_active"]
    search_fields = ["location_name", "location_code", "city"]


@admin.register(JobRoleMaster)
class JobRoleMasterAdmin(admin.ModelAdmin):
    list_display = ["id", "job_role_name", "job_role_code", "is_active"]
    search_fields = ["job_role_name", "job_role_code"]


@admin.register(EmployeeMaster)
class EmployeeMasterAdmin(admin.ModelAdmin):
    list_display = ["id", "employee_code", "user", "company", "department", "job_role", "employment_status"]
    list_filter = ["company", "department", "employment_status"]
    search_fields = ["employee_code", "user__email", "user__username"]


@admin.register(EmployeeReportingManager)
class EmployeeReportingManagerAdmin(admin.ModelAdmin):
    list_display = ["id", "employee", "manager", "relationship_type", "created_at"]
    list_filter = ["relationship_type"]
    search_fields = ["employee__employee_code", "manager__employee_code"]
