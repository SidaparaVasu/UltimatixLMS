from django.db.models import Prefetch

from common.repositories.base import BaseRepository
from ..constants import EmploymentStatus, RelationshipType
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

    def get_for_company(self, company: CompanyMaster, pk: int):
        return self.filter(company=company, pk=pk).first()

    def get_active_for_company(self, company: CompanyMaster):
        return self.filter(company=company, is_active=True)


class DepartmentRepository(BaseRepository[DepartmentMaster]):
    model = DepartmentMaster

    def get_sub_departments(self, parent_id):
        return self.filter(parent_department_id=parent_id, is_active=True)

    def get_for_company(self, company: CompanyMaster, pk: int):
        return self.filter(business_unit__company=company, pk=pk).select_related("business_unit").first()

    def get_active_for_company(self, company: CompanyMaster, business_unit_id: int | None = None):
        queryset = self.filter(
            business_unit__company=company,
            is_active=True,
        ).select_related("business_unit")
        if business_unit_id:
            queryset = queryset.filter(business_unit_id=business_unit_id)
        return queryset


class LocationRepository(BaseRepository[LocationMaster]):
    model = LocationMaster

    def get_for_company(self, company: CompanyMaster, pk: int):
        return self.filter(company=company, pk=pk).first()

    def get_active_for_company(self, company: CompanyMaster):
        return self.filter(company=company, is_active=True)


class JobRoleRepository(BaseRepository[JobRoleMaster]):
    model = JobRoleMaster

    def get_for_company(self, company: CompanyMaster, pk: int):
        return self.filter(company=company, pk=pk).first()

    def get_active_for_company(self, company: CompanyMaster):
        return self.filter(company=company, is_active=True)


class EmployeeRepository(BaseRepository[EmployeeMaster]):
    model = EmployeeMaster

    def get_by_code(self, code):
        return self.filter(employee_code=code).first()

    def get_by_user(self, user):
        return self.filter(user=user).first()

    def get_for_company(self, company: CompanyMaster, pk: int):
        return self.get_directory_queryset(company=company).filter(pk=pk).first()

    def exists_code(self, code: str, exclude_employee_id: int | None = None) -> bool:
        queryset = self.filter(employee_code=code.strip())
        if exclude_employee_id:
            queryset = queryset.exclude(pk=exclude_employee_id)
        return queryset.exists()

    def get_directory_queryset(self, company: CompanyMaster | None = None):
        queryset = self.model.objects.select_related(
            "user",
            "user__profile",
            "company",
            "business_unit",
            "department",
            "job_role",
            "location",
        ).prefetch_related(
            Prefetch(
                "managers",
                queryset=EmployeeReportingManager.objects.filter(
                    relationship_type=RelationshipType.DIRECT
                ).select_related(
                    "manager", 
                    "manager__user", 
                    "manager__user__profile"
                ),
                to_attr="direct_manager_links",
            )
        ).order_by("employee_code")

        if company is not None:
            queryset = queryset.filter(company=company)

        return queryset

    def get_active_for_company(self, company: CompanyMaster, exclude_employee_id: int | None = None):
        queryset = self.get_directory_queryset(company=company).filter(
            user__is_active=True,
            employment_status=EmploymentStatus.ACTIVE,
        )
        if exclude_employee_id:
            queryset = queryset.exclude(pk=exclude_employee_id)
        return queryset

    def update(self, pk, **data):
        instance = self.get_by_id(pk)
        if not instance:
            return None

        partial = data.pop("partial", True)
        allowed = {
            "user", "employee_code", "company", "business_unit",
            "department", "job_role", "location", "joining_date",
            "employment_status",
        }
        safe = {k: v for k, v in data.items() if k in allowed}

        for attr, value in safe.items():
            setattr(instance, attr, value)

        update_fields = list(safe.keys())
        if update_fields:
            instance.save(update_fields=update_fields)
        elif not partial:
            instance.save()
        return instance


class ReportingManagerRepository(BaseRepository[EmployeeReportingManager]):
    model = EmployeeReportingManager

    def get_managers(self, employee_id):
        return self.filter(employee_id=employee_id).select_related("manager")

    def get_subordinates(self, manager_id):
        return self.filter(manager_id=manager_id).select_related("employee")

    def get_direct_manager_link(self, employee: EmployeeMaster):
        return self.filter(
            employee=employee,
            relationship_type=RelationshipType.DIRECT,
        ).select_related("manager", "manager__user", "manager__user__profile").first()

    def get_direct_manager(self, employee: EmployeeMaster):
        link = self.get_direct_manager_link(employee)
        return link.manager if link else None

    def clear_direct_managers(self, employee: EmployeeMaster) -> int:
        deleted, _ = self.filter(
            employee=employee,
            relationship_type=RelationshipType.DIRECT,
        ).delete()
        return deleted

    def set_direct_manager(self, employee: EmployeeMaster, manager: EmployeeMaster):
        self.clear_direct_managers(employee)
        return self.create(
            employee=employee,
            manager=manager,
            relationship_type=RelationshipType.DIRECT,
        )
