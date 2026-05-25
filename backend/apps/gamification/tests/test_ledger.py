from django.test import TestCase

from apps.gamification.constants import AwardRuleCode, PointSourceType
from apps.gamification.models import PointBalance, PointTransaction
from apps.gamification.services import DuplicatePointAwardError, PointLedgerService
from apps.org_management.models import (
    BusinessUnitMaster,
    CompanyMaster,
    DepartmentMaster,
    EmployeeMaster,
    JobRoleMaster,
    LocationMaster,
)


class PointLedgerServiceTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.company = CompanyMaster.objects.create(
            company_name="Gami Co",
            company_code="GAMI",
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
        cls.employee = EmployeeMaster.objects.create(
            employee_code="GAMI001",
            company=cls.company,
            business_unit=cls.bu,
            department=cls.dept,
            job_role=cls.job_role,
            location=cls.location,
        )
        cls.service = PointLedgerService()

    def test_credit_points_creates_transaction_and_balance(self):
        txn = self.service.credit_points(
            employee_id=self.employee.id,
            company_id=self.company.id,
            amount=100,
            rule_code=AwardRuleCode.COURSE_COMPLETED,
            source_type=PointSourceType.ENROLLMENT,
            source_id=1,
        )
        self.assertIsNotNone(txn)
        self.assertEqual(txn.amount, 100)
        self.assertEqual(self.service.get_balance(self.employee.id), 100)
        self.assertEqual(PointTransaction.objects.count(), 1)
        balance = PointBalance.objects.get(employee=self.employee)
        self.assertEqual(balance.lifetime_xp, 100)
        self.assertEqual(balance.company_id, self.company.id)

    def test_duplicate_award_is_idempotent(self):
        self.service.credit_points(
            employee_id=self.employee.id,
            company_id=self.company.id,
            amount=50,
            rule_code=AwardRuleCode.ASSESSMENT_PASSED,
            source_type=PointSourceType.ASSESSMENT_RESULT,
            source_id=99,
        )
        second = self.service.credit_points(
            employee_id=self.employee.id,
            company_id=self.company.id,
            amount=50,
            rule_code=AwardRuleCode.ASSESSMENT_PASSED,
            source_type=PointSourceType.ASSESSMENT_RESULT,
            source_id=99,
        )
        self.assertEqual(PointTransaction.objects.count(), 1)
        self.assertEqual(self.service.get_balance(self.employee.id), 50)
        self.assertEqual(second.id, PointTransaction.objects.first().id)

    def test_duplicate_award_raises_when_requested(self):
        self.service.credit_points(
            employee_id=self.employee.id,
            company_id=self.company.id,
            amount=10,
            rule_code=AwardRuleCode.STREAK_DAY_BONUS,
            source_type=PointSourceType.STREAK,
            source_id=1,
        )
        with self.assertRaises(DuplicatePointAwardError):
            self.service.credit_points(
                employee_id=self.employee.id,
                company_id=self.company.id,
                amount=10,
                rule_code=AwardRuleCode.STREAK_DAY_BONUS,
                source_type=PointSourceType.STREAK,
                source_id=1,
                raise_on_duplicate=True,
            )

    def test_multiple_awards_accumulate_balance(self):
        self.service.credit_points(
            employee_id=self.employee.id,
            company_id=self.company.id,
            amount=100,
            rule_code=AwardRuleCode.COURSE_COMPLETED,
            source_type=PointSourceType.ENROLLMENT,
            source_id=1,
        )
        self.service.credit_points(
            employee_id=self.employee.id,
            company_id=self.company.id,
            amount=75,
            rule_code=AwardRuleCode.SKILL_UPGRADE_APPROVED,
            source_type=PointSourceType.SKILL_UPGRADE_PROPOSAL,
            source_id=2,
        )
        self.assertEqual(self.service.get_balance(self.employee.id), 175)
        self.assertEqual(PointTransaction.objects.count(), 2)

    def test_zero_amount_skips_ledger_write(self):
        result = self.service.credit_points(
            employee_id=self.employee.id,
            company_id=self.company.id,
            amount=0,
            rule_code=AwardRuleCode.COURSE_COMPLETED,
            source_type=PointSourceType.ENROLLMENT,
            source_id=77,
        )
        self.assertIsNone(result)
        self.assertEqual(PointTransaction.objects.count(), 0)
        self.assertEqual(self.service.get_balance(self.employee.id), 0)
