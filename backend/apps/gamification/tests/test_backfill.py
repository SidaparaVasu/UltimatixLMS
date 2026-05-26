from datetime import timedelta
from decimal import Decimal
from io import StringIO

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from apps.assessment_engine.models import AssessmentAttempt, AssessmentMaster, AssessmentResult
from apps.core_system.models import FeatureFlag
from apps.gamification.constants import AwardRuleCode, FeatureKeys, PointSourceType
from apps.gamification.models import CompanyGamificationConfig, PointTransaction
from apps.gamification.services import GamificationBackfillService, PointLedgerService
from apps.learning_progress.constants import ProgressStatus
from apps.learning_progress.models import UserCourseEnrollment
from apps.org_management.models import (
    BusinessUnitMaster,
    CompanyMaster,
    DepartmentMaster,
    EmployeeMaster,
    JobRoleMaster,
    LocationMaster,
)
from apps.course_management.models import CourseCategoryMaster, CourseMaster


class GamificationBackfillTest(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("loaddata", "initial_award_rules", verbosity=0)
        call_command("loaddata", "initial_badge_definitions", verbosity=0)

        FeatureFlag.objects.update_or_create(
            feature_key=FeatureKeys.GAMIFICATION_ENABLED,
            defaults={"is_enabled": True},
        )
        cls.company = CompanyMaster.objects.create(
            company_name="Backfill Co",
            company_code="BFL",
        )
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
        user = get_user_model().objects.create_user(
            username="backfill@test.com",
            email="backfill@test.com",
            password="TestPass123!",
        )
        cls.employee = EmployeeMaster.objects.create(
            employee_code="BFL001",
            user=user,
            company=cls.company,
            business_unit=bu,
            department=dept,
            job_role=role,
            location=loc,
        )
        category = CourseCategoryMaster.objects.create(
            category_name="General",
            category_code="GEN-BFL",
        )
        cls.course = CourseMaster.objects.create(
            course_title="Backfill Course",
            course_code="BFL-C1",
            category=category,
            created_by=cls.employee,
        )

    def _complete_enrollment(self):
        enrollment = UserCourseEnrollment.objects.create(
            employee=self.employee,
            course=self.course,
            status=ProgressStatus.IN_PROGRESS,
        )
        UserCourseEnrollment.objects.filter(pk=enrollment.pk).update(
            status=ProgressStatus.COMPLETED
        )
        enrollment.refresh_from_db()
        return enrollment

    def test_dry_run_reports_pending_awards(self):
        self._complete_enrollment()
        stats = GamificationBackfillService(
            dry_run=True,
            xp_percent=50,
        ).run(company_id=self.company.id)

        self.assertEqual(stats.courses.created, 1)
        self.assertEqual(PointTransaction.objects.count(), 0)

    def test_live_backfill_creates_scaled_xp_and_is_idempotent(self):
        enrollment = self._complete_enrollment()
        service = GamificationBackfillService(xp_percent=50)
        first = service.run(company_id=self.company.id)
        self.assertEqual(first.courses.created, 1)
        self.assertEqual(PointLedgerService().get_balance(self.employee.id), 50)

        txn = PointTransaction.objects.get(
            rule_code=AwardRuleCode.COURSE_COMPLETED,
            source_type=PointSourceType.ENROLLMENT,
            source_id=enrollment.id,
        )
        self.assertTrue(txn.metadata.get("backfill"))
        self.assertEqual(txn.metadata.get("xp_percent"), 50)

        second = service.run(company_id=self.company.id)
        self.assertEqual(second.courses.created, 0)
        self.assertEqual(second.courses.skipped, 1)
        self.assertEqual(PointTransaction.objects.count(), 1)

    def test_assessment_backfill_respects_pass_sequence(self):
        assessment = AssessmentMaster.objects.create(
            title="Backfill Quiz",
            passing_percentage=Decimal("50"),
        )
        attempt1 = AssessmentAttempt.objects.create(
            employee=self.employee,
            assessment=assessment,
            status="COMPLETED",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        result1 = AssessmentResult.objects.create(
            attempt=attempt1,
            score_percentage=Decimal("80"),
            status="PASS",
        )
        attempt2 = AssessmentAttempt.objects.create(
            employee=self.employee,
            assessment=assessment,
            status="COMPLETED",
            expires_at=timezone.now() + timedelta(hours=1),
        )
        result2 = AssessmentResult.objects.create(
            attempt=attempt2,
            score_percentage=Decimal("85"),
            status="PASS",
        )

        GamificationBackfillService(xp_percent=100).run(company_id=self.company.id)

        first_txn = PointTransaction.objects.get(
            source_type=PointSourceType.ASSESSMENT_RESULT,
            source_id=result1.id,
        )
        second_txn = PointTransaction.objects.get(
            source_type=PointSourceType.ASSESSMENT_RESULT,
            source_id=result2.id,
        )
        self.assertEqual(first_txn.amount, 50)
        self.assertEqual(second_txn.amount, 20)

    def test_management_command_dry_run_output(self):
        self._complete_enrollment()
        out = StringIO()
        call_command(
            "backfill_gamification",
            "--company-id",
            str(self.company.id),
            "--dry-run",
            stdout=out,
        )
        output = out.getvalue()
        self.assertIn("DRY RUN", output)
        self.assertIn("Courses", output)
