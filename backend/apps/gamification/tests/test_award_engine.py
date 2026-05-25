from datetime import timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management import call_command
from django.test import TestCase
from django.utils import timezone

from apps.assessment_engine.models import (
    AssessmentAttempt,
    AssessmentMaster,
    AssessmentResult,
    SkillUpgradeProposal,
)
from apps.assessment_engine.constants import SkillUpgradeStatus
from apps.certificate_management.models import IssuedCertificate
from apps.certificate_management.constants import CertificateType
from apps.core_system.models import FeatureFlag
from apps.course_management.models import CourseCategoryMaster, CourseMaster
from apps.gamification.constants import AwardRuleCode, FeatureKeys, PointSourceType
from apps.gamification.models import CompanyGamificationConfig, PointTransaction
from apps.gamification.services import AwardEngine, PointLedgerService
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
from apps.skill_management.models import SkillLevelMaster, SkillMaster


class GamificationAwardTestBase(TestCase):
    @classmethod
    def setUpTestData(cls):
        call_command("loaddata", "initial_award_rules", verbosity=0)
        FeatureFlag.objects.update_or_create(
            feature_key=FeatureKeys.GAMIFICATION_ENABLED,
            defaults={"description": "Gamification", "is_enabled": True},
        )
        cls.company = CompanyMaster.objects.create(
            company_name="Award Co",
            company_code="AWD",
        )
        CompanyGamificationConfig.objects.create(
            company=cls.company,
            is_enabled=True,
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
            username="award.learner@test.com",
            email="award.learner@test.com",
            password="TestPass123!",
        )
        cls.employee = EmployeeMaster.objects.create(
            employee_code="AWD001",
            user=cls.user,
            company=cls.company,
            business_unit=cls.bu,
            department=cls.dept,
            job_role=cls.job_role,
            location=cls.location,
        )
        cls.category = CourseCategoryMaster.objects.create(
            category_name="General",
            category_code="GEN",
        )
        cls.course = CourseMaster.objects.create(
            course_title="Award Course",
            course_code="AWC1",
            category=cls.category,
            created_by=cls.employee,
        )
        cls.engine = AwardEngine()

    def _create_attempt(self, assessment):
        return AssessmentAttempt.objects.create(
            employee=self.employee,
            assessment=assessment,
            status="COMPLETED",
            expires_at=timezone.now() + timedelta(hours=1),
        )


class AwardEngineDirectTest(GamificationAwardTestBase):
    def test_award_course_completed_credits_ledger(self):
        enrollment = UserCourseEnrollment.objects.create(
            employee=self.employee,
            course=self.course,
            status=ProgressStatus.IN_PROGRESS,
        )
        txn = self.engine.award_course_completed(enrollment)
        self.assertIsNotNone(txn)
        self.assertEqual(txn.amount, 100)
        self.assertEqual(PointLedgerService().get_balance(self.employee.id), 100)

    def test_mandatory_course_applies_multiplier(self):
        self.course.is_mandatory = True
        self.course.save(update_fields=["is_mandatory"])
        enrollment = UserCourseEnrollment.objects.create(
            employee=self.employee,
            course=self.course,
            status=ProgressStatus.COMPLETED,
        )
        txn = self.engine.award_course_completed(enrollment)
        self.assertEqual(txn.amount, 150)

    def test_assessment_first_pass_full_points(self):
        assessment = AssessmentMaster.objects.create(
            title="Quiz",
            course=self.course,
            passing_percentage=Decimal("50"),
        )
        attempt = self._create_attempt(assessment)
        result = AssessmentResult.objects.create(
            attempt=attempt,
            score_percentage=Decimal("80"),
            status="PASS",
        )
        txn = self.engine.award_assessment_passed(result)
        self.assertEqual(txn.amount, 50)

    def test_assessment_second_pass_reduced_points(self):
        assessment = AssessmentMaster.objects.create(
            title="Retake Quiz",
            course=self.course,
            passing_percentage=Decimal("50"),
        )
        attempt1 = self._create_attempt(assessment)
        AssessmentResult.objects.create(
            attempt=attempt1,
            score_percentage=Decimal("80"),
            status="PASS",
        )
        attempt2 = self._create_attempt(assessment)
        result2 = AssessmentResult.objects.create(
            attempt=attempt2,
            score_percentage=Decimal("85"),
            status="PASS",
        )
        txn = self.engine.award_assessment_passed(result2)
        self.assertEqual(txn.amount, 20)

    def test_inactive_company_skips_award(self):
        config = CompanyGamificationConfig.objects.get(company=self.company)
        config.is_enabled = False
        config.save(update_fields=["is_enabled"])
        enrollment = UserCourseEnrollment.objects.create(
            employee=self.employee,
            course=self.course,
            status=ProgressStatus.COMPLETED,
        )
        txn = self.engine.award_course_completed(enrollment)
        self.assertIsNone(txn)
        self.assertEqual(PointLedgerService().get_balance(self.employee.id), 0)


class AwardEngineSignalTest(GamificationAwardTestBase):
    def test_enrollment_completion_signal_awards_once(self):
        enrollment = UserCourseEnrollment.objects.create(
            employee=self.employee,
            course=self.course,
            status=ProgressStatus.IN_PROGRESS,
        )
        enrollment.status = ProgressStatus.COMPLETED
        enrollment.save(update_fields=["status"])

        self.assertEqual(
            PointTransaction.objects.filter(
                rule_code=AwardRuleCode.COURSE_COMPLETED,
                source_type=PointSourceType.ENROLLMENT,
                source_id=enrollment.id,
            ).count(),
            1,
        )
        self.assertGreaterEqual(PointLedgerService().get_balance(self.employee.id), 100)

        enrollment.save(update_fields=["status"])
        self.assertEqual(
            PointTransaction.objects.filter(
                rule_code=AwardRuleCode.COURSE_COMPLETED,
            ).count(),
            1,
        )

    def test_assessment_pass_signal_on_create(self):
        assessment = AssessmentMaster.objects.create(
            title="Signal Quiz",
            course=self.course,
            passing_percentage=Decimal("50"),
        )
        attempt = self._create_attempt(assessment)
        AssessmentResult.objects.create(
            attempt=attempt,
            score_percentage=Decimal("90"),
            status="PASS",
        )
        # 50 assessment pass + 10 first-day pass_daily streak bonus
        self.assertEqual(PointLedgerService().get_balance(self.employee.id), 60)

    def test_skill_upgrade_approval_signal(self):
        skill = SkillMaster.objects.create(
            skill_name="Python",
            skill_code="PY-AWD",
        )
        level = SkillLevelMaster.objects.create(
            level_name="Intermediate",
            level_rank=2,
        )
        assessment = AssessmentMaster.objects.create(
            title="Standalone",
            passing_percentage=Decimal("50"),
        )
        attempt = self._create_attempt(assessment)
        proposal = SkillUpgradeProposal.objects.create(
            employee=self.employee,
            assessment_attempt=attempt,
            skill=skill,
            proposed_level=level,
            status=SkillUpgradeStatus.PENDING,
        )
        proposal.status = SkillUpgradeStatus.APPROVED
        proposal.save(update_fields=["status"])

        self.assertEqual(PointLedgerService().get_balance(self.employee.id), 75)

    def test_certificate_issued_signal(self):
        IssuedCertificate.objects.create(
            employee=self.employee,
            certificate_type=CertificateType.COURSE,
            entity_id="1",
            course_or_assessment_name="Award Course",
            completion_date="2026-01-15",
        )
        self.assertEqual(PointLedgerService().get_balance(self.employee.id), 50)
