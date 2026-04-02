from common.repositories.base import BaseRepository
from ..models import (
    CompanyMaster,
    BusinessUnitMaster,
    DepartmentMaster,
    LocationMaster,
    JobRoleMaster,
    EmployeeMaster,
    EmployeeReportingManager
)


class CompanyRepository(BaseRepository[CompanyMaster]):
    model = CompanyMaster


class BusinessUnitRepository(BaseRepository[BusinessUnitMaster]):
    model = BusinessUnitMaster


class DepartmentRepository(BaseRepository[DepartmentMaster]):
    model = DepartmentMaster

    def get_sub_departments(self, parent_id):
        return self.filter(parent_department_id=parent_id, is_active=True)


class LocationRepository(BaseRepository[LocationMaster]):
    model = LocationMaster


class JobRoleRepository(BaseRepository[JobRoleMaster]):
    model = JobRoleMaster


class EmployeeRepository(BaseRepository[EmployeeMaster]):
    model = EmployeeMaster

    def get_by_code(self, code):
        return self.filter(employee_code=code).first()

    def get_by_user(self, user):
        return self.filter(user=user).first()


class ReportingManagerRepository(BaseRepository[EmployeeReportingManager]):
    model = EmployeeReportingManager

    def get_managers(self, employee_id):
        return self.filter(employee_id=employee_id).select_related("manager")

    def get_subordinates(self, manager_id):
        return self.filter(manager_id=manager_id).select_related("employee")
