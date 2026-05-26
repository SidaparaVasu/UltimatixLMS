from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core_system.models import FeatureFlag
from apps.gamification.constants import AwardRuleCode, FeatureKeys, PointSourceType
from apps.gamification.models import CompanyGamificationConfig
from apps.gamification.services import PointLedgerService
from apps.org_management.models import (
    BusinessUnitMaster,
    CompanyMaster,
    DepartmentMaster,
    EmployeeMaster,
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


class LearnerGamificationAPITest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("loaddata", "initial_award_rules", verbosity=0)
        call_command("loaddata", "01_permission_groups", verbosity=0)
        call_command("loaddata", "02_permissions", verbosity=0)
        call_command("loaddata", "03_system_roles", verbosity=0)
        call_command("loaddata", "04_role_permissions", verbosity=0)

        FeatureFlag.objects.update_or_create(
            feature_key=FeatureKeys.GAMIFICATION_ENABLED,
            defaults={"description": "Gamification", "is_enabled": True},
        )

        cls.company = CompanyMaster.objects.create(
            company_name="Learner API Co",
            company_code="LAPI",
        )
        CompanyGamificationConfig.objects.create(company=cls.company, is_enabled=True)

        gamification_group = PermissionGroupMaster.objects.get(group_code="GAMIFICATION")
        CompanyPermissionGroup.objects.create(
            company=cls.company,
            permission_group=gamification_group,
            is_active=True,
        )

        cls.bu = BusinessUnitMaster.objects.create(
            company=cls.company,
            business_unit_name="BU",
            business_unit_code="BU1",
        )
        cls.dept = DepartmentMaster.objects.create(
            business_unit=cls.bu,
            department_name="Dept",
            department_code="D1",
        )
        cls.location = LocationMaster.objects.create(
            company=cls.company,
            location_name="HQ",
            location_code="HQ1",
        )
        cls.job_role = JobRoleMaster.objects.create(
            company=cls.company,
            job_role_name="Engineer",
            job_role_code="ENG",
        )

        user_model = get_user_model()
        cls.user = user_model.objects.create_user(
            username="learner.api@test.com",
            email="learner.api@test.com",
            password="TestPass123!",
        )
        cls.other_user = user_model.objects.create_user(
            username="other.api@test.com",
            email="other.api@test.com",
            password="TestPass123!",
        )

        cls.employee = EmployeeMaster.objects.create(
            employee_code="LAPI001",
            user=cls.user,
            company=cls.company,
            business_unit=cls.bu,
            department=cls.dept,
            job_role=cls.job_role,
            location=cls.location,
        )
        cls.other_employee = EmployeeMaster.objects.create(
            employee_code="LAPI002",
            user=cls.other_user,
            company=cls.company,
            business_unit=cls.bu,
            department=cls.dept,
            job_role=cls.job_role,
            location=cls.location,
        )

        lms_user = RoleMaster.objects.get(role_code="LMS_USER")
        UserRoleMaster.objects.create(
            user=cls.user, role=lms_user, scope_type=ScopeType.GLOBAL
        )
        UserRoleMaster.objects.create(
            user=cls.other_user, role=lms_user, scope_type=ScopeType.GLOBAL
        )
        cache.delete(f"rbac_user_perms_{cls.user.id}")
        cache.delete(f"rbac_user_perms_{cls.other_user.id}")

        ledger = PointLedgerService()
        ledger.credit_points(
            employee_id=cls.employee.id,
            company_id=cls.company.id,
            amount=100,
            rule_code=AwardRuleCode.COURSE_COMPLETED,
            source_type=PointSourceType.ENROLLMENT,
            source_id=1,
        )
        ledger.credit_points(
            employee_id=cls.other_employee.id,
            company_id=cls.company.id,
            amount=200,
            rule_code=AwardRuleCode.COURSE_COMPLETED,
            source_type=PointSourceType.ENROLLMENT,
            source_id=2,
        )

    def test_summary_requires_auth(self):
        url = reverse("gamification-me-summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_summary_returns_xp_and_rank(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("gamification-me-summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["success"])
        data = response.data["data"]
        self.assertEqual(data["lifetime_xp"], 100)
        self.assertEqual(data["rank"], 2)
        self.assertGreaterEqual(data["pool_size"], 2)
        self.assertEqual(len(data["recent_transactions"]), 1)
        self.assertEqual(data["recent_transactions"][0]["rule_code"], AwardRuleCode.COURSE_COMPLETED)

    def test_summary_forbidden_when_company_disabled(self):
        config = CompanyGamificationConfig.objects.get(company=self.company)
        config.is_enabled = False
        config.save(update_fields=["is_enabled"])

        self.client.force_authenticate(user=self.user)
        url = reverse("gamification-me-summary")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_transactions_paginated_and_scoped_to_self(self):
        ledger = PointLedgerService()
        for source_id in range(3, 8):
            ledger.credit_points(
                employee_id=self.employee.id,
                company_id=self.company.id,
                amount=10,
                rule_code=AwardRuleCode.STREAK_DAY_BONUS,
                source_type=PointSourceType.STREAK,
                source_id=source_id,
            )
        ledger.credit_points(
            employee_id=self.other_employee.id,
            company_id=self.company.id,
            amount=500,
            rule_code=AwardRuleCode.ASSESSMENT_PASSED,
            source_type=PointSourceType.ASSESSMENT_RESULT,
            source_id=99,
        )

        self.client.force_authenticate(user=self.user)
        url = reverse("gamification-me-transactions")
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data["data"]["results"]
        self.assertEqual(len(results), 6)
        for row in results:
            self.assertNotEqual(row["amount"], 500)
