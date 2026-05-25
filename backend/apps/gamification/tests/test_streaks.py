from datetime import date, timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from apps.assessment_engine.models import AssessmentAttempt, AssessmentMaster, AssessmentResult
from apps.core_system.models import FeatureFlag
from apps.gamification.constants import FeatureKeys, StreakType
from apps.gamification.models import CompanyGamificationConfig, EmployeeStreak
from apps.gamification.services import StreakService
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


class StreakServiceTest(APITestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("loaddata", "initial_award_rules", verbosity=0)

        FeatureFlag.objects.update_or_create(
            feature_key=FeatureKeys.GAMIFICATION_ENABLED,
            defaults={"is_enabled": True},
        )
        cls.company = CompanyMaster.objects.create(
            company_name="Streak Co",
            company_code="STR",
        )
        CompanyGamificationConfig.objects.create(company=cls.company, is_enabled=True)

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
        cls.employee = EmployeeMaster.objects.create(
            employee_code="STR001",
            company=cls.company,
            business_unit=cls.bu,
            department=cls.dept,
            job_role=cls.job_role,
            location=cls.location,
        )
        cls.service = StreakService()

    def test_learning_calendar_streak_three_days(self):
        today = timezone.localdate()
        self.service.record_calendar_streak(
            self.employee, StreakType.LEARNING, today - timedelta(days=2)
        )
        self.service.record_calendar_streak(
            self.employee, StreakType.LEARNING, today - timedelta(days=1)
        )
        self.service.record_calendar_streak(self.employee, StreakType.LEARNING, today)

        streak = EmployeeStreak.objects.get(
            employee=self.employee, streak_type=StreakType.LEARNING
        )
        self.assertEqual(streak.current_streak, 3)
        self.assertEqual(streak.longest_streak, 3)

    def test_learning_streak_breaks_after_gap(self):
        today = timezone.localdate()
        self.service.record_calendar_streak(self.employee, StreakType.LEARNING, today - timedelta(days=3))
        self.service.record_calendar_streak(self.employee, StreakType.LEARNING, today)
        streak = EmployeeStreak.objects.get(
            employee=self.employee, streak_type=StreakType.LEARNING
        )
        self.assertEqual(streak.current_streak, 1)

    def test_pass_consecutive_increments_and_resets_on_fail(self):
        self.service.increment_pass_consecutive(self.employee)
        self.service.increment_pass_consecutive(self.employee)
        streak = EmployeeStreak.objects.get(
            employee=self.employee, streak_type=StreakType.PASS_CONSECUTIVE
        )
        self.assertEqual(streak.current_streak, 2)

        self.service.reset_pass_consecutive(self.employee)
        streak.refresh_from_db()
        self.assertEqual(streak.current_streak, 0)

    def test_close_streak_days_resets_stale_calendar_streaks(self):
        today = timezone.localdate()
        self.service.record_calendar_streak(self.employee, StreakType.PASS_DAILY, today - timedelta(days=5))
        broken = self.service.break_stale_calendar_streaks(company_id=self.company.id)
        self.assertEqual(broken, 1)
        streak = EmployeeStreak.objects.get(
            employee=self.employee, streak_type=StreakType.PASS_DAILY
        )
        self.assertEqual(streak.current_streak, 0)


class StreakSignalAPITest(APITestCase):
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
        cls.company = CompanyMaster.objects.create(company_name="Streak API", company_code="STRA")
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
            business_unit=bu, department_name="D", department_code="D1"
        )
        loc = LocationMaster.objects.create(
            company=cls.company, location_name="HQ", location_code="HQ1"
        )
        role = JobRoleMaster.objects.create(
            company=cls.company, job_role_name="Eng", job_role_code="E1"
        )
        user = get_user_model().objects.create_user(
            username="streak.api@test.com",
            email="streak.api@test.com",
            password="TestPass123!",
        )
        cls.employee = EmployeeMaster.objects.create(
            employee_code="STRA01",
            user=user,
            company=cls.company,
            business_unit=bu,
            department=dept,
            job_role=role,
            location=loc,
        )
        UserRoleMaster.objects.create(user=user, role=RoleMaster.objects.get(role_code="LMS_USER"), scope_type=ScopeType.GLOBAL)

    def test_summary_returns_live_streaks_after_pass(self):
        from datetime import timedelta as td

        assessment = AssessmentMaster.objects.create(title="Streak Quiz", passing_percentage=50)
        attempt = AssessmentAttempt.objects.create(
            employee=self.employee,
            assessment=assessment,
            status="COMPLETED",
            submitted_at=timezone.now(),
            expires_at=timezone.now() + td(hours=1),
        )
        AssessmentResult.objects.create(
            attempt=attempt,
            score_percentage=80,
            status="PASS",
        )

        self.client.force_authenticate(user=self.employee.user)
        response = self.client.get(reverse("gamification-me-summary"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        streaks = response.data["data"]["streaks"]
        self.assertEqual(streaks["pass_daily"]["current"], 1)
        self.assertEqual(streaks["pass_consecutive"]["current"], 1)
