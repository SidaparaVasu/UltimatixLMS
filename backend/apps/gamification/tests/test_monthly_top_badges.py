from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from apps.core_system.models import FeatureFlag
from apps.gamification.constants import AwardRuleCode, FeatureKeys, PointSourceType
from apps.gamification.models import CompanyGamificationConfig, EmployeeBadge
from apps.gamification.period_utils import month_bounds
from apps.gamification.services import MonthlyTopBadgeService, PointLedgerService
from apps.org_management.models import (
    BusinessUnitMaster,
    CompanyMaster,
    DepartmentMaster,
    EmployeeMaster,
    JobRoleMaster,
    LocationMaster,
)


class MonthlyTopBadgeServiceTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("loaddata", "initial_award_rules", verbosity=0)
        call_command("loaddata", "initial_badge_definitions", verbosity=0)

        FeatureFlag.objects.update_or_create(
            feature_key=FeatureKeys.GAMIFICATION_ENABLED,
            defaults={"is_enabled": True},
        )
        cls.company = CompanyMaster.objects.create(company_name="Top Co", company_code="TOP")
        CompanyGamificationConfig.objects.create(company=cls.company, is_enabled=True)

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
        cls.employees = []
        for idx in range(3):
            user = user_model.objects.create_user(
                username=f"top{idx}@test.com",
                email=f"top{idx}@test.com",
                password="TestPass123!",
            )
            emp = EmployeeMaster.objects.create(
                employee_code=f"TOP{idx:02d}",
                user=user,
                company=cls.company,
                business_unit=bu,
                department=dept,
                job_role=role,
                location=loc,
            )
            cls.employees.append(emp)

        cls.service = MonthlyTopBadgeService()
        cls.ledger = PointLedgerService()
        cls.target_year = 2026
        cls.target_month = 1

    def _credit_in_month(self, employee, amount: int, source_id: int):
        period_start, _ = month_bounds(self.target_year, self.target_month)
        self.ledger.credit_points(
            employee_id=employee.id,
            company_id=self.company.id,
            amount=amount,
            rule_code=AwardRuleCode.COURSE_COMPLETED,
            source_type=PointSourceType.ENROLLMENT,
            source_id=source_id,
        )
        from apps.gamification.models import PointTransaction

        PointTransaction.objects.filter(
            employee_id=employee.id,
            source_id=source_id,
        ).update(created_at=period_start + timedelta(hours=1))

    def test_awards_top_performer_for_closed_month(self):
        self._credit_in_month(self.employees[0], 500, 1001)
        self._credit_in_month(self.employees[1], 300, 1002)
        self._credit_in_month(self.employees[2], 100, 1003)

        stats = self.service.award_for_company(
            self.company.id,
            self.target_year,
            self.target_month,
        )
        self.assertEqual(stats.top_employee_ids, [e.id for e in self.employees])
        self.assertEqual(stats.awarded, 3)

        self.assertTrue(
            EmployeeBadge.objects.filter(
                employee=self.employees[0],
                badge__code="TOP_10_MONTH",
            ).exists()
        )

    def test_skips_employees_who_already_have_badge(self):
        self._credit_in_month(self.employees[0], 400, 2001)
        first = self.service.award_for_company(
            self.company.id, self.target_year, self.target_month
        )
        self.assertEqual(first.awarded, 1)

        second = self.service.award_for_company(
            self.company.id, self.target_year, self.target_month
        )
        self.assertEqual(second.awarded, 0)
        self.assertEqual(second.skipped_already_earned, 1)

    def test_dry_run_does_not_create_badges(self):
        self._credit_in_month(self.employees[0], 250, 3001)
        stats = self.service.award_for_company(
            self.company.id,
            self.target_year,
            self.target_month,
            dry_run=True,
        )
        self.assertEqual(stats.awarded, 1)
        self.assertFalse(
            EmployeeBadge.objects.filter(badge__code="TOP_10_MONTH").exists()
        )

    def test_management_command_with_year_month(self):
        self._credit_in_month(self.employees[1], 600, 4001)
        call_command(
            "award_monthly_top_badges",
            company_id=self.company.id,
            year=self.target_year,
            month=self.target_month,
        )
        self.assertTrue(
            EmployeeBadge.objects.filter(
                employee=self.employees[1],
                badge__code="TOP_10_MONTH",
            ).exists()
        )
