from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase
from apps.auth_security.models import AuthUser
from apps.org_management.models import (
    CompanyMaster,
    BusinessUnitMaster,
    DepartmentMaster,
    LocationMaster,
    JobRoleMaster,
    EmployeeMaster,
    EmployeeReportingManager
)
from apps.org_management.constants import EmploymentStatus, RelationshipType


class OrgManagementTestCase(APITestCase):
    def setUp(self):
        # Create user for auth
        self.user = AuthUser.objects.create_user(
            email="test_admin@example.com",
            username="testadmin",
            password="TestPassword123!"
        )
        self.client.force_authenticate(user=self.user)

        # Base structure
        self.company = CompanyMaster.objects.create(
            company_name="Test Company",
            company_code="TC"
        )
        self.bu = BusinessUnitMaster.objects.create(
            company=self.company,
            business_unit_name="Technology",
            business_unit_code="TECH"
        )
        self.dept = DepartmentMaster.objects.create(
            business_unit=self.bu,
            department_name="Engineering",
            department_code="ENG"
        )
        self.location = LocationMaster.objects.create(
            company=self.company,
            location_name="HQ",
            location_code="HQ"
        )
        self.role = JobRoleMaster.objects.create(
            job_role_name="Developer",
            job_role_code="DEV"
        )

        # Base Employee
        self.employee1 = EmployeeMaster.objects.create(
            user=self.user,
            employee_code="EMP001",
            company=self.company,
            business_unit=self.bu,
            department=self.dept,
            job_role=self.role,
            location=self.location,
            employment_status=EmploymentStatus.ACTIVE
        )

    def test_unauthenticated_access(self):
        # Need to unauthenticate first
        self.client.force_authenticate(user=None)
        
        response = self.client.get(reverse("companies-list"))
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        response = self.client.post(reverse("companies-list"), data={"company_name": "New"})
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_crud_company(self):
        # Create
        data = {"company_name": "New Company", "company_code": "NC"}
        response = self.client.post(reverse("companies-list"), data=data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["company_name"], "New Company")
        company_id = response.data["data"]["id"]

        # List
        response = self.client.get(reverse("companies-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(response.data["data"]["results"]), 2)

        # Retrieve
        response = self.client.get(reverse("companies-detail", args=[company_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["company_code"], "NC")

    def test_update_company_put_patch(self):
        # PUT requires all required fields
        data = {"company_name": "Updated TC Put", "company_code": "TC_PUT"}
        response = self.client.put(reverse("companies-detail", args=[self.company.id]), data=data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["company_name"], "Updated TC Put")

        # PATCH allows partial fields
        data = {"company_name": "Updated TC Patch"}
        response = self.client.patch(reverse("companies-detail", args=[self.company.id]), data=data)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["company_name"], "Updated TC Patch")

    def test_soft_delete(self):
        # Soft delete is default: ?soft_delete=true or basically the parameter logic from views
        response = self.client.delete(reverse("companies-detail", args=[self.company.id]) + "?soft_delete=true")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify in DB
        self.company.refresh_from_db()
        self.assertFalse(self.company.is_active)

    def test_hard_delete(self):
        company2 = CompanyMaster.objects.create(company_name="Temp", company_code="TEMP")
        
        response = self.client.delete(reverse("companies-detail", args=[company2.id]) + "?soft_delete=false")
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        with self.assertRaises(CompanyMaster.DoesNotExist):
            company2.refresh_from_db()

    def test_create_employee(self):
        data = {
            "employee_code": "EMP002",
            "company": self.company.id,
            "business_unit": self.bu.id,
            "department": self.dept.id,
            "job_role": self.role.id,
            "location": self.location.id,
            "employment_status": EmploymentStatus.ACTIVE
        }
        response = self.client.post(reverse("employees-list"), data=data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["data"]["employee_code"], "EMP002")

    def test_prohibited_employee_deletion(self):
        response = self.client.delete(reverse("employees-detail", args=[self.employee1.id]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(response.data["message"], "Deletion not allowed for EmployeeMaster records.")

    def test_employee_manager_mapping(self):
        self.employee2 = EmployeeMaster.objects.create(
            user=self.user,
            employee_code="EMP002",
            company=self.company,
            business_unit=self.bu,
            department=self.dept,
            job_role=self.role,
            location=self.location,
            employment_status=EmploymentStatus.ACTIVE
        )

        data = {
            "employee": self.employee2.id,
            "manager": self.employee1.id,
            "relationship_type": RelationshipType.DIRECT
        }
        
        response = self.client.post(reverse("reporting-mappings-list"), data=data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        mapping_id = response.data["data"]["id"]

        # Deletion is prohibited
        del_response = self.client.delete(reverse("reporting-mappings-detail", args=[mapping_id]))
        self.assertEqual(del_response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(del_response.data["message"], "Deletion not allowed for EmployeeReportingManager records.")

    def test_unique_together_constraints(self):
        # Test business_unit_code and company_id uniqueness
        data = {
            "company": self.company.id,
            "business_unit_name": "Another BU",
            "business_unit_code": "TECH"  # Same code as self.bu
        }
        response = self.client.post(reverse("business-units-list"), data=data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        # Should raise validation error indicating constraints failed.
