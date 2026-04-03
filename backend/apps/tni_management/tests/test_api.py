from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.org_management.models import (
    CompanyMaster, BusinessUnitMaster, DepartmentMaster, 
    JobRoleMaster, EmployeeMaster, LocationMaster
)
from apps.skill_management.models import SkillMaster, SkillLevelMaster, JobRoleSkillRequirement
from apps.tni_management.models import TrainingNeed, TrainingNeedApproval
from apps.tni_management.constants import TNIStatus, TNIApprovalStatus


User = get_user_model()


class TNIAPITest(APITestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_superuser(
            username="admin", email="admin@test.com", password="password"
        )
        self.client.force_authenticate(user=self.user)

        # Base Org Setup (minimal)
        self.company = CompanyMaster.objects.create(company_name="Test Co", company_code="TCO")
        self.bu = BusinessUnitMaster.objects.create(company=self.company, business_unit_name="Tech")
        self.dept = DepartmentMaster.objects.create(business_unit=self.bu, department_name="Backend")
        self.loc = LocationMaster.objects.create(company=self.company, location_name="HQ")
        self.role = JobRoleMaster.objects.create(job_role_name="Backend Dev", job_role_code="BDEV")
        
        self.employee = EmployeeMaster.objects.create(
            user=self.user,
            employee_code="E001",
            company=self.company,
            business_unit=self.bu,
            department=self.dept,
            job_role=self.role,
            location=self.loc
        )

        self.skill = SkillMaster.objects.create(skill_name="Python", skill_code="PY")
        self.lvl = SkillLevelMaster.objects.create(level_name="Expert", level_rank=4)

        # Requirement
        self.req = JobRoleSkillRequirement.objects.create(
            job_role=self.role,
            skill=self.skill,
            required_level=self.lvl
        )

    def test_run_gap_analysis_endpoint(self):
        """
        Action Action: Trigger gap analysis for the authenticated user's employee profile.
        """
        url = "/api/v1/tni/tni-needs/run-gap-analysis/"
        response = self.client.post(url, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("data", response.data)
        
        # Verify a need was created in DB
        self.assertEqual(TrainingNeed.objects.count(), 1)

    def test_finalize_approval_endpoint(self):
        """
        Action Action: Finalize a pending approval via the API.
        """
        # Manually create a pending need and approval
        need = TrainingNeed.objects.create(
            employee=self.employee,
            skill=self.skill,
            status=TNIStatus.PENDING,
            priority="HIGH"
        )
        approval = TrainingNeedApproval.objects.create(
            training_need=need,
            approver=self.employee, # Self-approval for test simplicity
            approval_status=TNIApprovalStatus.PENDING
        )

        url = f"/api/v1/tni/approvals/{approval.id}/finalize/"
        payload = {
            "status": TNIApprovalStatus.APPROVED,
            "comments": "Looking good."
        }
        response = self.client.post(url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify DB state
        need.refresh_from_db()
        approval.refresh_from_db()
        
        self.assertEqual(approval.approval_status, TNIApprovalStatus.APPROVED)
        self.assertEqual(need.status, TNIStatus.APPROVED)

    def test_tni_needs_list_pagination(self):
        """
        Verify that the standard response envelope is returned for lists.
        """
        url = "/api/v1/tni/tni-needs/"
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("results", response.data["data"])
