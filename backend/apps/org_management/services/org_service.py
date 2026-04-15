import logging

from django.db import transaction

from apps.auth_security.repositories.auth_repository import (
    AuthUserProfileRepository,
    AuthUserRepository,
)
from apps.auth_security.services.password_service import PasswordService
from apps.auth_security.services.session_service import SessionService
from common.exceptions import ValidationException
from common.services.base import BaseService
from ..constants import EmploymentStatus
from ..repositories import (
    CompanyRepository,
    BusinessUnitRepository,
    DepartmentRepository,
    LocationRepository,
    JobRoleRepository,
    EmployeeRepository,
    ReportingManagerRepository
)

logger = logging.getLogger(__name__)


class CompanyService(BaseService):
    repository_class = CompanyRepository


class BusinessUnitService(BaseService):
    repository_class = BusinessUnitRepository

    def get_dropdown_options(self, company):
        return self.repository.get_active_for_company(company=company)


class DepartmentService(BaseService):
    repository_class = DepartmentRepository

    def get_hierarchy(self, parent_id=None):
        """Fetch department tree levels."""
        return self.repository.get_sub_departments(parent_id)

    def get_dropdown_options(self, company, business_unit_id=None):
        return self.repository.get_active_for_company(
            company=company,
            business_unit_id=business_unit_id,
        )


class LocationService(BaseService):
    repository_class = LocationRepository

    def get_dropdown_options(self, company):
        return self.repository.get_active_for_company(company=company)


class JobRoleService(BaseService):
    repository_class = JobRoleRepository

    def get_dropdown_options(self, company):
        return self.repository.get_active_for_company(company=company)


class EmployeeService(BaseService):
    repository_class = EmployeeRepository

    def __init__(
        self,
        repository=None,
        business_unit_repo=None,
        department_repo=None,
        location_repo=None,
        job_role_repo=None,
        reporting_repo=None,
        user_repo=None,
        profile_repo=None,
        password_service=None,
        session_service=None,
    ):
        super().__init__(repository=repository)
        self._business_unit_repo = business_unit_repo
        self._department_repo = department_repo
        self._location_repo = location_repo
        self._job_role_repo = job_role_repo
        self._reporting_repo = reporting_repo
        self._user_repo = user_repo
        self._profile_repo = profile_repo
        self._password_service = password_service
        self._session_service = session_service

    @property
    def business_unit_repo(self):
        if self._business_unit_repo is None:
            self._business_unit_repo = BusinessUnitRepository()
        return self._business_unit_repo

    @property
    def department_repo(self):
        if self._department_repo is None:
            self._department_repo = DepartmentRepository()
        return self._department_repo

    @property
    def location_repo(self):
        if self._location_repo is None:
            self._location_repo = LocationRepository()
        return self._location_repo

    @property
    def job_role_repo(self):
        if self._job_role_repo is None:
            self._job_role_repo = JobRoleRepository()
        return self._job_role_repo

    @property
    def reporting_repo(self):
        if self._reporting_repo is None:
            self._reporting_repo = ReportingManagerRepository()
        return self._reporting_repo

    @property
    def user_repo(self):
        if self._user_repo is None:
            self._user_repo = AuthUserRepository()
        return self._user_repo

    @property
    def profile_repo(self):
        if self._profile_repo is None:
            self._profile_repo = AuthUserProfileRepository()
        return self._profile_repo

    @property
    def password_service(self):
        if self._password_service is None:
            self._password_service = PasswordService()
        return self._password_service

    @property
    def session_service(self):
        if self._session_service is None:
            self._session_service = SessionService()
        return self._session_service

    def get_by_code(self, employee_code):
        return self.repository.get_by_code(employee_code)

    def get_by_user(self, user):
        return self.repository.get_by_user(user)

    def get_directory_queryset(self, company):
        return self.repository.get_directory_queryset(company=company)

    def get_directory_employee(self, company, employee_id):
        return self.repository.get_for_company(company=company, pk=employee_id)

    def get_manager_options(self, company, exclude_employee_id=None):
        return self.repository.get_active_for_company(
            company=company,
            exclude_employee_id=exclude_employee_id,
        )

    @transaction.atomic
    def create_full_profile(self, company, **data):
        business_unit = data["business_unit"]
        department = data["department"]
        job_role = data["job_role"]
        location = data["location"]
        manager = data.get("manager")
        is_active = data.get("is_active", True)

        self._validate_relationships(
            company=company,
            business_unit=business_unit,
            department=department,
            job_role=job_role,
            location=location,
            manager=manager,
        )

        self.password_service.validate_policy(data["password"])
        user = self.user_repo.create(
            email=data["email"],
            username=data["username"],
            password=data["password"],
            is_active=is_active,
        )
        self.profile_repo.update(
            user,
            **self._build_profile_payload(data),
        )

        employee = self.repository.create(
            user=user,
            employee_code=data["employee_code"],
            company=company,
            business_unit=business_unit,
            department=department,
            job_role=job_role,
            location=location,
            joining_date=data.get("joining_date"),
            employment_status=self._status_from_active(is_active),
        )

        if manager:
            self.reporting_repo.set_direct_manager(employee, manager)

        logger.info("Employee full profile created: employee_id=%s user_id=%s", employee.id, user.id)
        return self.repository.get_for_company(company=company, pk=employee.pk)

    @transaction.atomic
    def update_full_profile(self, employee, **data):
        business_unit = data.get("business_unit", employee.business_unit)
        department = data.get("department", employee.department)
        job_role = data.get("job_role", employee.job_role)
        location = data.get("location", employee.location)
        manager_supplied = "manager" in data
        manager = data.get("manager") if manager_supplied else None

        self._validate_relationships(
            company=employee.company,
            business_unit=business_unit,
            department=department,
            job_role=job_role,
            location=location,
            manager=manager,
            employee=employee,
        )

        user = employee.user
        if user is None:
            missing_fields = [
                field_name
                for field_name in ("username", "email", "password")
                if data.get(field_name) in (None, "")
            ]
            if missing_fields:
                raise ValidationException(
                    errors={
                        field_name: ["This field is required to provision a user account."]
                        for field_name in missing_fields
                    }
                )

            self.password_service.validate_policy(data["password"])
            user = self.user_repo.create(
                email=data["email"],
                username=data["username"],
                password=data["password"],
                is_active=data.get("is_active", True),
            )
            employee = self.repository.update(employee.pk, user=user, partial=True)
        else:
            user_updates = {}
            for field_name in ("username", "email", "is_active"):
                if field_name in data:
                    user_updates[field_name] = data[field_name]
            if user_updates:
                self.user_repo.update(user, **user_updates)

            new_password = data.get("password")
            if new_password:
                self.password_service.reset_password(
                    user=user,
                    new_password=new_password,
                    revoke_all_sessions=True,
                )

        profile_payload = self._build_profile_payload(data)
        if profile_payload:
            self.profile_repo.update(user, **profile_payload)

        employee_updates = {}
        for field_name, value in (
            ("employee_code", data.get("employee_code")),
            ("business_unit", business_unit),
            ("department", department),
            ("job_role", job_role),
            ("location", location),
        ):
            if field_name in data or field_name in {"business_unit", "department", "job_role", "location"}:
                employee_updates[field_name] = value

        if "joining_date" in data:
            employee_updates["joining_date"] = data.get("joining_date")

        if "is_active" in data:
            employee_updates["employment_status"] = self._status_from_active(data["is_active"])
            if user and data["is_active"] is False:
                self.session_service.revoke_all_sessions(user)

        if employee_updates:
            employee = self.repository.update(employee.pk, partial=True, **employee_updates)

        if manager_supplied:
            if manager is None:
                self.reporting_repo.clear_direct_managers(employee)
            else:
                self.reporting_repo.set_direct_manager(employee, manager)

        logger.info("Employee full profile updated: employee_id=%s", employee.id)
        return self.repository.get_for_company(company=employee.company, pk=employee.pk)

    @transaction.atomic
    def delete(self, pk, soft_delete: bool = True) -> bool:
        employee = self.repository.get_by_id(pk)
        if not employee:
            return False

        if not soft_delete:
            raise ValidationException(errors={"soft_delete": ["Hard delete is not allowed for employee records."]})

        if employee.user:
            self.session_service.revoke_all_sessions(employee.user)
            self.user_repo.update(employee.user, is_active=False)

        self.repository.update(
            employee.pk,
            partial=True,
            employment_status=EmploymentStatus.INACTIVE,
        )
        logger.info("Employee soft deleted: employee_id=%s", employee.id)
        return True

    def _build_profile_payload(self, data):
        payload = {}
        for field_name in (
            "first_name",
            "last_name",
            "phone_number",
            "profile_image_url",
            "date_of_birth",
            "gender",
        ):
            if field_name in data:
                payload[field_name] = data.get(field_name)
        return payload

    def _status_from_active(self, is_active: bool) -> str:
        return EmploymentStatus.ACTIVE if is_active else EmploymentStatus.INACTIVE

    def _validate_relationships(
        self,
        company,
        business_unit,
        department,
        job_role,
        location,
        manager=None,
        employee=None,
    ):
        if business_unit.company_id != company.id:
            raise ValidationException(errors={"business_unit": ["Business unit does not belong to your company."]})
        if not business_unit.is_active:
            raise ValidationException(errors={"business_unit": ["Business unit is inactive."]})

        if department.business_unit_id != business_unit.id:
            raise ValidationException(errors={"department": ["Department does not belong to the selected business unit."]})
        if not department.is_active:
            raise ValidationException(errors={"department": ["Department is inactive."]})

        if job_role.company_id != company.id:
            raise ValidationException(errors={"job_role": ["Job role does not belong to your company."]})
        if not job_role.is_active:
            raise ValidationException(errors={"job_role": ["Job role is inactive."]})

        if location.company_id != company.id:
            raise ValidationException(errors={"location": ["Location does not belong to your company."]})
        if not location.is_active:
            raise ValidationException(errors={"location": ["Location is inactive."]})

        if manager:
            if employee and manager.pk == employee.pk:
                raise ValidationException(errors={"manager": ["An employee cannot report to themselves."]})
            if manager.company_id != company.id:
                raise ValidationException(errors={"manager": ["Reporting manager does not belong to your company."]})
            if not manager.user or not manager.user.is_active:
                raise ValidationException(errors={"manager": ["Reporting manager must have an active user account."]})
            if manager.employment_status != EmploymentStatus.ACTIVE:
                raise ValidationException(errors={"manager": ["Reporting manager must be an active employee."]})
            if employee:
                self._ensure_no_cycle(employee=employee, manager=manager)

    def _ensure_no_cycle(self, employee, manager):
        visited = set()
        current = manager
        while current:
            if current.pk == employee.pk:
                raise ValidationException(errors={"manager": ["Manager assignment would create a reporting cycle."]})
            if current.pk in visited:
                raise ValidationException(errors={"manager": ["Reporting structure contains a cycle."]})
            visited.add(current.pk)
            current = self.reporting_repo.get_direct_manager(current)


class ReportingManagerService(BaseService):
    repository_class = ReportingManagerRepository

    def get_reporting_line(self, employee_id):
        return self.repository.get_managers(employee_id)

    def get_team_members(self, manager_id):
        return self.repository.get_subordinates(manager_id)
