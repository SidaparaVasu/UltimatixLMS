from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core_system.models import FeatureFlag
from apps.gamification.constants import FeatureKeys
from apps.gamification.models import AwardRule, CompanyGamificationConfig
from apps.gamification.services import PointLedgerService
from apps.org_management.constants import RelationshipType
from apps.org_management.models import (
    BusinessUnitMaster,
    CompanyMaster,
    DepartmentMaster,
    EmployeeMaster,
    EmployeeReportingManager,
    JobRoleMaster,
    LocationMaster,
)
from apps.rbac.constants import ScopeType
from apps.rbac.models import (
    CompanyPermissionGroup,
    PermissionGroupMaster,
    RoleMaster,
    UserRoleMaster,
)


class GamificationTeamAdminAPITest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("loaddata", "initial_award_rules", verbosity=0)
        call_command("loaddata", "01_permission_groups", verbosity=0)
        call_command("loaddata", "02_permissions", verbosity=0)
        call_command("loaddata", "03_system_roles", verbosity=0)
        call_command("loaddata", "04_role_permissions", verbosity=0)

        FeatureFlag.objects.update_or_create(
            feature_key=FeatureKeys.GAMIFICATION_ENABLED,
            defaults={"is_enabled": True},
        )
        cls.company = CompanyMaster.objects.create(company_name="Team Co", company_code="TEAM")
        CompanyGamificationConfig.objects.create(company=cls.company, is_enabled=True)
        CompanyPermissionGroup.objects.create(
            company=cls.company,
            permission_group=PermissionGroupMaster.objects.get(group_code="GAMIFICATION"),
            is_active=True,
        )

        bu = BusinessUnitMaster.objects.create(
            company=cls.company, business_unit_name="BU", business_unit_code="BU1"
        )
        dept = DepartmentMaster.objects.create(
            business_unit=bu, department_name="Dept", department_code="D1"
        )
        loc = LocationMaster.objects.create(
            company=cls.company, location_name="HQ", location_code="HQ1"
        )
        role = JobRoleMaster.objects.create(
            company=cls.company, job_role_name="Eng", job_role_code="E1"
        )

        user_model = get_user_model()
        cls.manager_user = user_model.objects.create_user(
            username="manager.team@test.com",
            email="manager.team@test.com",
            password="TestPass123!",
        )
        cls.manager = EmployeeMaster.objects.create(
            employee_code="MGR01",
            user=cls.manager_user,
            company=cls.company,
            business_unit=bu,
            department=dept,
            job_role=role,
            location=loc,
        )
        cls.report_user = user_model.objects.create_user(
            username="report.team@test.com",
            email="report.team@test.com",
            password="TestPass123!",
        )
        cls.report = EmployeeMaster.objects.create(
            employee_code="RPT01",
            user=cls.report_user,
            company=cls.company,
            business_unit=bu,
            department=dept,
            job_role=role,
            location=loc,
        )
        cls.outsider_user = user_model.objects.create_user(
            username="outsider.team@test.com",
            email="outsider.team@test.com",
            password="TestPass123!",
        )
        cls.outsider = EmployeeMaster.objects.create(
            employee_code="OUT01",
            user=cls.outsider_user,
            company=cls.company,
            business_unit=bu,
            department=dept,
            job_role=role,
            location=loc,
        )
        EmployeeReportingManager.objects.create(
            employee=cls.report,
            manager=cls.manager,
            relationship_type=RelationshipType.DIRECT,
        )

        learner_role = RoleMaster.objects.get(role_code="LMS_USER")
        manager_role = RoleMaster.objects.get(role_code="LMS_HR")
        admin_role = RoleMaster.objects.get(role_code="LMS_ADMIN")
        UserRoleMaster.objects.create(
            user=cls.manager_user,
            role=manager_role,
            scope_type=ScopeType.GLOBAL,
        )
        UserRoleMaster.objects.create(
            user=cls.report_user,
            role=learner_role,
            scope_type=ScopeType.GLOBAL,
        )
        UserRoleMaster.objects.create(
            user=cls.outsider_user,
            role=learner_role,
            scope_type=ScopeType.GLOBAL,
        )

        cls.admin_user = user_model.objects.create_user(
            username="admin.team@test.com",
            email="admin.team@test.com",
            password="TestPass123!",
        )
        cls.admin_employee = EmployeeMaster.objects.create(
            employee_code="ADM01",
            user=cls.admin_user,
            company=cls.company,
            business_unit=bu,
            department=dept,
            job_role=role,
            location=loc,
        )
        UserRoleMaster.objects.create(
            user=cls.admin_user,
            role=admin_role,
            scope_type=ScopeType.GLOBAL,
        )

        PointLedgerService().credit_points(
            employee_id=cls.report.id,
            company_id=cls.company.id,
            amount=250,
            rule_code="COURSE_COMPLETED",
            source_type="ENROLLMENT",
            source_id=9001,
        )

    def test_manager_sees_report_in_team_list(self):
        self.client.force_authenticate(user=self.manager_user)
        response = self.client.get(reverse("gamification-team-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        payload = response.data["data"]
        rows = payload["results"] if isinstance(payload, dict) else payload
        employee_ids = {row["employee_id"] for row in rows}
        self.assertIn(self.report.id, employee_ids)
        self.assertNotIn(self.outsider.id, employee_ids)

    def test_manager_cannot_view_outsider_detail(self):
        self.client.force_authenticate(user=self.manager_user)
        response = self.client.get(
            reverse("gamification-team-detail", kwargs={"pk": self.outsider.id})
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_manager_can_view_report_detail(self):
        self.client.force_authenticate(user=self.manager_user)
        response = self.client.get(
            reverse("gamification-team-detail", kwargs={"pk": self.report.id})
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["employee_id"], self.report.id)
        self.assertEqual(response.data["data"]["lifetime_xp"], 250)

    def test_learner_cannot_access_team_endpoints(self):
        self.client.force_authenticate(user=self.report_user)
        response = self.client.get(reverse("gamification-team-list"))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_patch_company_config(self):
        self.client.force_authenticate(user=self.admin_user)
        response = self.client.patch(
            reverse("gamification-config"),
            {"streak_daily_xp_bonus": 15},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        config = CompanyGamificationConfig.objects.get(company=self.company)
        self.assertEqual(config.streak_daily_xp_bonus, 15)

    def test_manager_cannot_patch_company_config(self):
        self.client.force_authenticate(user=self.manager_user)
        response = self.client.patch(
            reverse("gamification-config"),
            {"is_enabled": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_can_list_and_override_award_rules(self):
        global_rule = AwardRule.objects.get(code="COURSE_COMPLETED", company__isnull=True)
        self.client.force_authenticate(user=self.admin_user)
        list_response = self.client.get(reverse("gamification-rules-list"))
        self.assertEqual(list_response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(len(list_response.data["data"]), 4)

        patch_response = self.client.patch(
            reverse("gamification-rules-detail", kwargs={"pk": global_rule.id}),
            {"base_points": 120, "is_active": True},
            format="json",
        )
        self.assertEqual(patch_response.status_code, status.HTTP_200_OK)
        company_rule = AwardRule.objects.get(
            code="COURSE_COMPLETED",
            company_id=self.company.id,
        )
        self.assertEqual(company_rule.base_points, 120)
