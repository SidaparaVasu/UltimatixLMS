from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.auth_security.models import AuthSessionLog, AuthUser, AuthUserProfile
from apps.org_management.constants import EmploymentStatus, RelationshipType
from apps.org_management.models import (
    BusinessUnitMaster,
    CompanyMaster,
    DepartmentMaster,
    EmployeeMaster,
    EmployeeReportingManager,
    JobRoleMaster,
    LocationMaster,
)


class OrgManagementTestCase(APITestCase):
    def setUp(self):
        self.company = CompanyMaster.objects.create(
            company_name="Test Company",
            company_code="TC",
        )
        self.business_unit = BusinessUnitMaster.objects.create(
            company=self.company,
            business_unit_name="Technology",
            business_unit_code="TECH",
        )
        self.department = DepartmentMaster.objects.create(
            business_unit=self.business_unit,
            department_name="Engineering",
            department_code="ENG",
        )
        self.department_two = DepartmentMaster.objects.create(
            business_unit=self.business_unit,
            department_name="QA",
            department_code="QA",
        )
        self.location = LocationMaster.objects.create(
            company=self.company,
            location_name="HQ",
            location_code="HQ",
            city="Ahmedabad",
        )
        self.role = JobRoleMaster.objects.create(
            company=self.company,
            job_role_name="Developer",
            job_role_code="DEV",
        )

        self.other_company = CompanyMaster.objects.create(
            company_name="Other Company",
            company_code="OC",
        )
        self.other_business_unit = BusinessUnitMaster.objects.create(
            company=self.other_company,
            business_unit_name="Finance",
            business_unit_code="FIN",
        )
        self.other_department = DepartmentMaster.objects.create(
            business_unit=self.other_business_unit,
            department_name="Accounts",
            department_code="ACC",
        )
        self.other_location = LocationMaster.objects.create(
            company=self.other_company,
            location_name="Branch",
            location_code="BR",
            city="Pune",
        )
        self.other_role = JobRoleMaster.objects.create(
            company=self.other_company,
            job_role_name="Analyst",
            job_role_code="ANL",
        )

        self.admin_user = self._create_user("admin", "Admin", "User")
        self.admin_employee = self._create_employee(
            user=self.admin_user,
            employee_code="EMP001",
        )
        self.client.force_authenticate(user=self.admin_user)

    def _create_user(self, username, first_name, last_name, *, email=None, is_active=True):
        user = AuthUser.objects.create_user(
            email=email or f"{username}@example.com",
            username=username,
            password="TestPassword123!",
            is_active=is_active,
        )
        AuthUserProfile.objects.create(
            user=user,
            first_name=first_name,
            last_name=last_name,
            phone_number="+919000000001",
        )
        return user

    def _create_employee(
        self,
        *,
        user,
        employee_code,
        company=None,
        business_unit=None,
        department=None,
        job_role=None,
        location=None,
        employment_status=EmploymentStatus.ACTIVE,
    ):
        return EmployeeMaster.objects.create(
            user=user,
            employee_code=employee_code,
            company=company or self.company,
            business_unit=business_unit or self.business_unit,
            department=department or self.department,
            job_role=job_role or self.role,
            location=location or self.location,
            employment_status=employment_status,
        )

    def test_unauthenticated_access(self):
        self.client.force_authenticate(user=None)

        response = self.client.get(reverse("employees-list"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_employee_list_returns_combined_directory_rows_and_scopes_company(self):
        manager_user = self._create_user("manager", "Mira", "Manager")
        manager_employee = self._create_employee(
            user=manager_user,
            employee_code="EMP002",
        )

        same_company_user = self._create_user("engineer", "Esha", "Engineer")
        same_company_employee = self._create_employee(
            user=same_company_user,
            employee_code="EMP003",
            department=self.department_two,
        )
        EmployeeReportingManager.objects.create(
            employee=same_company_employee,
            manager=manager_employee,
            relationship_type=RelationshipType.DIRECT,
        )

        other_user = self._create_user("otherstaff", "Other", "Staff", email="otherstaff@example.com")
        self._create_employee(
            user=other_user,
            employee_code="EMP900",
            company=self.other_company,
            business_unit=self.other_business_unit,
            department=self.other_department,
            job_role=self.other_role,
            location=self.other_location,
        )

        response = self.client.get(reverse("employees-list"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]["results"]
        self.assertEqual(len(results), 3)
        employee_codes = {row["employee_code"] for row in results}
        self.assertEqual(employee_codes, {"EMP001", "EMP002", "EMP003"})

        target_row = next(row for row in results if row["employee_code"] == "EMP003")
        self.assertEqual(target_row["first_name"], "Esha")
        self.assertEqual(target_row["manager_name"], "Mira Manager")
        self.assertEqual(target_row["email"], "engineer@example.com")
        self.assertTrue(target_row["is_active"])

    def test_create_full_employee_profile_creates_user_profile_employee_and_manager_mapping(self):
        manager_user = self._create_user("leaduser", "Leena", "Lead")
        manager_employee = self._create_employee(
            user=manager_user,
            employee_code="EMP002",
        )

        payload = {
            "username": "newhire",
            "email": "newhire@example.com",
            "password": "SecurePassword123!",
            "first_name": "Nina",
            "last_name": "Hire",
            "phone_number": "+919876543210",
            "date_of_birth": "1997-04-20",
            "gender": "female",
            "employee_code": "EMP003",
            "business_unit": self.business_unit.id,
            "department": self.department.id,
            "job_role": self.role.id,
            "location": self.location.id,
            "manager": manager_employee.id,
            "joining_date": "2026-04-01",
            "is_active": True,
        }

        response = self.client.post(reverse("employees-list"), data=payload)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["employee_code"], "EMP003")
        self.assertEqual(response.data["data"]["gender"], "female")
        self.assertEqual(response.data["data"]["manager"], manager_employee.id)

        created_user = AuthUser.objects.get(username="newhire")
        created_profile = AuthUserProfile.objects.get(user=created_user)
        created_employee = EmployeeMaster.objects.get(employee_code="EMP003")
        created_mapping = EmployeeReportingManager.objects.get(
            employee=created_employee,
            relationship_type=RelationshipType.DIRECT,
        )

        self.assertEqual(created_user.email, "newhire@example.com")
        self.assertEqual(created_profile.first_name, "Nina")
        self.assertEqual(created_profile.gender, "F")
        self.assertEqual(created_employee.user_id, created_user.id)
        self.assertEqual(created_employee.employment_status, EmploymentStatus.ACTIVE)
        self.assertEqual(created_mapping.manager_id, manager_employee.id)

    def test_create_employee_rejects_department_outside_selected_business_unit(self):
        second_business_unit = BusinessUnitMaster.objects.create(
            company=self.company,
            business_unit_name="Operations",
            business_unit_code="OPS",
        )
        second_department = DepartmentMaster.objects.create(
            business_unit=second_business_unit,
            department_name="Support",
            department_code="SUP",
        )

        payload = {
            "username": "badmapping",
            "email": "badmapping@example.com",
            "password": "SecurePassword123!",
            "first_name": "Bad",
            "last_name": "Mapping",
            "phone_number": "+919876543210",
            "employee_code": "EMP004",
            "business_unit": self.business_unit.id,
            "department": second_department.id,
            "job_role": self.role.id,
            "location": self.location.id,
        }

        response = self.client.post(reverse("employees-list"), data=payload)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("department", response.data["errors"])

    def test_update_full_employee_profile_updates_user_profile_org_and_manager(self):
        employee_user = self._create_user("developer", "Dev", "User")
        employee = self._create_employee(
            user=employee_user,
            employee_code="EMP010",
        )

        manager_user = self._create_user("qahead", "Qara", "Lead")
        manager_employee = self._create_employee(
            user=manager_user,
            employee_code="EMP011",
        )

        payload = {
            "first_name": "Updated",
            "last_name": "Engineer",
            "phone_number": "+919999888877",
            "department": self.department_two.id,
            "manager": manager_employee.id,
            "joining_date": "2026-03-01",
        }

        response = self.client.patch(reverse("employees-detail", args=[employee.id]), data=payload)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        employee.refresh_from_db()
        employee.user.refresh_from_db()
        employee.user.profile.refresh_from_db()

        self.assertEqual(employee.department_id, self.department_two.id)
        self.assertEqual(employee.joining_date.isoformat(), "2026-03-01")
        self.assertEqual(employee.user.profile.first_name, "Updated")
        self.assertEqual(employee.user.profile.phone_number, "+919999888877")
        self.assertEqual(
            EmployeeReportingManager.objects.get(
                employee=employee,
                relationship_type=RelationshipType.DIRECT,
            ).manager_id,
            manager_employee.id,
        )

    def test_update_employee_rejects_reporting_cycle(self):
        manager_user = self._create_user("cyclemgr", "Cycle", "Manager")
        manager_employee = self._create_employee(
            user=manager_user,
            employee_code="EMP020",
        )
        EmployeeReportingManager.objects.create(
            employee=manager_employee,
            manager=self.admin_employee,
            relationship_type=RelationshipType.DIRECT,
        )

        response = self.client.patch(
            reverse("employees-detail", args=[self.admin_employee.id]),
            data={"manager": manager_employee.id},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("manager", response.data["errors"])

    def test_soft_delete_employee_deactivates_user_and_revokes_sessions(self):
        employee_user = self._create_user("deactivate", "De", "Activate")
        employee = self._create_employee(
            user=employee_user,
            employee_code="EMP030",
        )
        AuthSessionLog.objects.create(
            user=employee_user,
            session_key="session-soft-delete",
            ip_address="127.0.0.1",
            is_active=True,
        )

        response = self.client.delete(reverse("employees-detail", args=[employee.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        employee.refresh_from_db()
        employee_user.refresh_from_db()

        self.assertFalse(employee_user.is_active)
        self.assertEqual(employee.employment_status, EmploymentStatus.INACTIVE)
        self.assertFalse(
            AuthSessionLog.objects.get(session_key="session-soft-delete").is_active
        )

    def test_manager_options_returns_only_active_same_company_employees(self):
        active_manager_user = self._create_user("activelead", "Active", "Lead")
        active_manager = self._create_employee(
            user=active_manager_user,
            employee_code="EMP040",
        )

        inactive_manager_user = self._create_user("inactivelead", "Inactive", "Lead", is_active=False)
        self._create_employee(
            user=inactive_manager_user,
            employee_code="EMP041",
            employment_status=EmploymentStatus.INACTIVE,
        )

        other_company_user = self._create_user("foreignlead", "Foreign", "Lead", email="foreignlead@example.com")
        self._create_employee(
            user=other_company_user,
            employee_code="EMP042",
            company=self.other_company,
            business_unit=self.other_business_unit,
            department=self.other_department,
            job_role=self.other_role,
            location=self.other_location,
        )

        response = self.client.get(
            reverse("employees-manager-options"),
            data={"exclude_employee_id": self.admin_employee.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        option_codes = {row["employee_code"] for row in response.data["data"]}
        self.assertEqual(option_codes, {"EMP040"})
        self.assertIn("Active Lead", {row["full_name"] for row in response.data["data"]})

    def test_business_unit_options_return_active_same_company_records_only(self):
        BusinessUnitMaster.objects.create(
            company=self.company,
            business_unit_name="Inactive Unit",
            business_unit_code="INACT",
            is_active=False,
        )
        BusinessUnitMaster.objects.create(
            company=self.other_company,
            business_unit_name="Other Unit",
            business_unit_code="OTHER",
        )

        response = self.client.get(reverse("business-units-options"))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["data"],
            [{"id": self.business_unit.id, "name": "Technology"}],
        )

    def test_department_options_support_business_unit_filter_and_scope_company(self):
        second_business_unit = BusinessUnitMaster.objects.create(
            company=self.company,
            business_unit_name="Operations",
            business_unit_code="OPS",
        )
        second_department = DepartmentMaster.objects.create(
            business_unit=second_business_unit,
            department_name="Support",
            department_code="SUP",
        )
        DepartmentMaster.objects.create(
            business_unit=self.business_unit,
            department_name="Inactive Department",
            department_code="INACTIVE",
            is_active=False,
        )
        DepartmentMaster.objects.create(
            business_unit=self.other_business_unit,
            department_name="Foreign Department",
            department_code="FRN",
        )

        response = self.client.get(
            reverse("departments-options"),
            data={"business_unit_id": second_business_unit.id},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["data"],
            [{"id": second_department.id, "name": "Support"}],
        )

    def test_department_options_reject_invalid_business_unit_id(self):
        response = self.client.get(
            reverse("departments-options"),
            data={"business_unit_id": "abc"},
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["message"], "business_unit_id must be an integer.")

    def test_location_and_job_role_options_return_active_same_company_records_only(self):
        LocationMaster.objects.create(
            company=self.company,
            location_name="Dormant Office",
            location_code="DO",
            is_active=False,
        )
        LocationMaster.objects.create(
            company=self.other_company,
            location_name="Other Office",
            location_code="OO",
        )
        JobRoleMaster.objects.create(
            company=self.company,
            job_role_name="Inactive Role",
            job_role_code="IROLE",
            is_active=False,
        )
        JobRoleMaster.objects.create(
            company=self.other_company,
            job_role_name="Foreign Role",
            job_role_code="FROLE",
        )

        location_response = self.client.get(reverse("locations-options"))
        job_role_response = self.client.get(reverse("job-roles-options"))

        self.assertEqual(location_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            location_response.data["data"],
            [{"id": self.location.id, "name": "HQ"}],
        )

        self.assertEqual(job_role_response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            job_role_response.data["data"],
            [{"id": self.role.id, "name": "Developer"}],
        )
