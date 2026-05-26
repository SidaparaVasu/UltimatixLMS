from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.core_system.models import FeatureFlag
from apps.gamification.constants import AwardRuleCode, FeatureKeys, PointSourceType
from apps.gamification.models import CompanyGamificationConfig, PointTransaction
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


class LeaderboardAPITest(APITestCase):
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
            company_name="Leaderboard Co",
            company_code="LBD",
        )
        CompanyGamificationConfig.objects.create(
            company=cls.company,
            is_enabled=True,
            inactive_leaderboard_days=90,
        )

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
        cls.dept_a = DepartmentMaster.objects.create(
            business_unit=cls.bu,
            department_name="Dept A",
            department_code="DA",
        )
        cls.dept_b = DepartmentMaster.objects.create(
            business_unit=cls.bu,
            department_name="Dept B",
            department_code="DB",
        )
        cls.location = LocationMaster.objects.create(
            company=cls.company,
            location_name="HQ",
            location_code="HQ1",
        )
        cls.role_eng = JobRoleMaster.objects.create(
            company=cls.company,
            job_role_name="Engineer",
            job_role_code="ENG",
        )
        cls.role_lead = JobRoleMaster.objects.create(
            company=cls.company,
            job_role_name="Lead",
            job_role_code="LEAD",
        )

        user_model = get_user_model()
        cls.user = user_model.objects.create_user(
            username="leaderboard.user@test.com",
            email="leaderboard.user@test.com",
            password="TestPass123!",
        )
        cls.user_b = user_model.objects.create_user(
            username="leaderboard.b@test.com",
            email="leaderboard.b@test.com",
            password="TestPass123!",
        )
        cls.inactive_user = user_model.objects.create_user(
            username="leaderboard.inactive@test.com",
            email="leaderboard.inactive@test.com",
            password="TestPass123!",
        )

        cls.employee = EmployeeMaster.objects.create(
            employee_code="LBD001",
            user=cls.user,
            company=cls.company,
            business_unit=cls.bu,
            department=cls.dept_a,
            job_role=cls.role_eng,
            location=cls.location,
        )
        cls.employee_b = EmployeeMaster.objects.create(
            employee_code="LBD002",
            user=cls.user_b,
            company=cls.company,
            business_unit=cls.bu,
            department=cls.dept_b,
            job_role=cls.role_lead,
            location=cls.location,
        )
        cls.inactive_employee = EmployeeMaster.objects.create(
            employee_code="LBD003",
            user=cls.inactive_user,
            company=cls.company,
            business_unit=cls.bu,
            department=cls.dept_a,
            job_role=cls.role_eng,
            location=cls.location,
        )

        lms_user = RoleMaster.objects.get(role_code="LMS_USER")
        for user in (cls.user, cls.user_b, cls.inactive_user):
            UserRoleMaster.objects.create(user=user, role=lms_user, scope_type=ScopeType.GLOBAL)
            cache.delete(f"rbac_user_perms_{user.id}")

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
            employee_id=cls.employee_b.id,
            company_id=cls.company.id,
            amount=250,
            rule_code=AwardRuleCode.COURSE_COMPLETED,
            source_type=PointSourceType.ENROLLMENT,
            source_id=2,
        )
        inactive_txn = ledger.credit_points(
            employee_id=cls.inactive_employee.id,
            company_id=cls.company.id,
            amount=80,
            rule_code=AwardRuleCode.COURSE_COMPLETED,
            source_type=PointSourceType.ENROLLMENT,
            source_id=3,
        )
        PointTransaction.objects.filter(pk=inactive_txn.pk).update(
            created_at=timezone.now() - timedelta(days=120)
        )

    def test_leaderboard_orders_by_xp_and_returns_my_rank(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("gamification-leaderboard-list")
        response = self.client.get(url, {"period": "all_time"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = response.data["data"]
        self.assertEqual(data["my_rank"]["rank"], 2)
        self.assertEqual(data["my_rank"]["period_xp"], 100)
        self.assertEqual(len(data["results"]), 2)
        self.assertEqual(data["results"][0]["employee_code"], "LBD002")
        self.assertEqual(data["results"][0]["period_xp"], 250)
        self.assertEqual(data["results"][1]["employee_code"], "LBD001")

    def test_leaderboard_department_filter(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("gamification-leaderboard-list")
        response = self.client.get(
            url,
            {"period": "all_time", "department_id": self.dept_a.id},
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        codes = [row["employee_code"] for row in response.data["data"]["results"]]
        self.assertEqual(codes, ["LBD001"])

    def test_inactive_employee_excluded(self):
        self.client.force_authenticate(user=self.user)
        url = reverse("gamification-leaderboard-list")
        response = self.client.get(url, {"period": "all_time"})
        codes = [row["employee_code"] for row in response.data["data"]["results"]]
        self.assertNotIn("LBD003", codes)

    def test_weekly_period_uses_recent_transactions_only(self):
        PointTransaction.objects.filter(
            employee_id=self.employee.id,
            source_id=1,
        ).update(created_at=timezone.now() - timedelta(days=20))
        PointTransaction.objects.filter(
            employee_id=self.employee_b.id,
            source_id=2,
        ).update(created_at=timezone.now() - timedelta(days=20))

        ledger = PointLedgerService()
        ledger.credit_points(
            employee_id=self.employee.id,
            company_id=self.company.id,
            amount=40,
            rule_code=AwardRuleCode.STREAK_DAY_BONUS,
            source_type=PointSourceType.STREAK,
            source_id=10,
        )
        old_txn = ledger.credit_points(
            employee_id=self.employee_b.id,
            company_id=self.company.id,
            amount=500,
            rule_code=AwardRuleCode.ASSESSMENT_PASSED,
            source_type=PointSourceType.ASSESSMENT_RESULT,
            source_id=11,
        )
        PointTransaction.objects.filter(pk=old_txn.pk).update(
            created_at=timezone.now() - timedelta(days=20)
        )

        self.client.force_authenticate(user=self.user)
        url = reverse("gamification-leaderboard-list")
        response = self.client.get(url, {"period": "weekly"})
        results = {row["employee_code"]: row["period_xp"] for row in response.data["data"]["results"]}
        self.assertEqual(results.get("LBD001"), 40)
        self.assertIsNone(results.get("LBD002"))
