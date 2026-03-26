from ..models import (
    CompanyMaster,
    BusinessUnitMaster,
    DepartmentMaster,
    LocationMaster,
    JobRoleMaster,
    EmployeeMaster,
    EmployeeReportingManager
)
from .base_service import BaseOrgService


class CompanyService(BaseOrgService):
    model = CompanyMaster


class BusinessUnitService(BaseOrgService):
    model = BusinessUnitMaster


class DepartmentService(BaseOrgService):
    model = DepartmentMaster


class LocationService(BaseOrgService):
    model = LocationMaster


class JobRoleService(BaseOrgService):
    model = JobRoleMaster


class EmployeeService(BaseOrgService):
    model = EmployeeMaster


class ReportingManagerService(BaseOrgService):
    model = EmployeeReportingManager
