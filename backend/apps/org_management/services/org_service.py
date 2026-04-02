from common.services.base import BaseService
from ..repositories import (
    CompanyRepository,
    BusinessUnitRepository,
    DepartmentRepository,
    LocationRepository,
    JobRoleRepository,
    EmployeeRepository,
    ReportingManagerRepository
)


class CompanyService(BaseService):
    repository_class = CompanyRepository


class BusinessUnitService(BaseService):
    repository_class = BusinessUnitRepository


class DepartmentService(BaseService):
    repository_class = DepartmentRepository

    def get_hierarchy(self, parent_id=None):
        """Fetch department tree levels."""
        return self.repository.get_sub_departments(parent_id)


class LocationService(BaseService):
    repository_class = LocationRepository


class JobRoleService(BaseService):
    repository_class = JobRoleRepository


class EmployeeService(BaseService):
    repository_class = EmployeeRepository

    def get_by_code(self, employee_code):
        return self.repository.get_by_code(employee_code)

    def get_by_user(self, user):
        return self.repository.get_by_user(user)


class ReportingManagerService(BaseService):
    repository_class = ReportingManagerRepository

    def get_reporting_line(self, employee_id):
        return self.repository.get_managers(employee_id)

    def get_team_members(self, manager_id):
        return self.repository.get_subordinates(manager_id)
