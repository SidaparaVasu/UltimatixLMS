from dataclasses import dataclass, field
from decimal import Decimal

from django.db import transaction

from apps.assessment_engine.constants import SkillUpgradeStatus
from apps.assessment_engine.models import AssessmentResult, SkillUpgradeProposal
from apps.certificate_management.models import IssuedCertificate
from apps.gamification.constants import AwardRuleCode, PointSourceType
from apps.gamification.models import CompanyGamificationConfig
from apps.gamification.repositories import CompanyGamificationConfigRepository
from apps.gamification.services.award_engine import AwardEngine
from apps.gamification.services.badge_evaluator import BadgeEvaluator
from apps.gamification.services.gamification_status_service import GamificationStatusService
from apps.gamification.services.point_ledger_service import PointLedgerService
from apps.learning_progress.constants import ProgressStatus
from apps.learning_progress.models import UserCourseEnrollment
from apps.org_management.models import EmployeeMaster


@dataclass
class BackfillCategoryStats:
    processed: int = 0
    created: int = 0
    skipped: int = 0
    skipped_zero: int = 0


@dataclass
class BackfillStats:
    companies: int = 0
    courses: BackfillCategoryStats = field(default_factory=BackfillCategoryStats)
    assessments: BackfillCategoryStats = field(default_factory=BackfillCategoryStats)
    skill_upgrades: BackfillCategoryStats = field(default_factory=BackfillCategoryStats)
    certificates: BackfillCategoryStats = field(default_factory=BackfillCategoryStats)
    badges_awarded: int = 0
    employees_badge_evaluated: int = 0

    @property
    def total_created(self) -> int:
        return (
            self.courses.created
            + self.assessments.created
            + self.skill_upgrades.created
            + self.certificates.created
        )

    @property
    def total_skipped(self) -> int:
        return (
            self.courses.skipped
            + self.assessments.skipped
            + self.skill_upgrades.skipped
            + self.certificates.skipped
        )


class GamificationBackfillService:
    def __init__(
        self,
        *,
        xp_percent: int = 50,
        dry_run: bool = False,
        include_badges: bool = False,
        force: bool = False,
        ledger: PointLedgerService | None = None,
        award_engine: AwardEngine | None = None,
        badge_evaluator: BadgeEvaluator | None = None,
        status_service: GamificationStatusService | None = None,
        config_repository: CompanyGamificationConfigRepository | None = None,
    ):
        self.xp_percent = max(0, min(100, int(xp_percent)))
        self.dry_run = dry_run
        self.include_badges = include_badges
        self.force = force
        self._ledger = ledger or PointLedgerService()
        self._engine = award_engine or AwardEngine()
        self._badges = badge_evaluator or BadgeEvaluator()
        self._status = status_service or GamificationStatusService()
        self._configs = config_repository or CompanyGamificationConfigRepository()

    def _scale_points(self, amount: int) -> int:
        if amount <= 0:
            return 0
        return max(0, int(amount * self.xp_percent / 100))

    def _backfill_metadata(self, extra: dict | None = None) -> dict:
        payload = {"backfill": True, "xp_percent": self.xp_percent}
        if extra:
            payload.update(extra)
        return payload

    def resolve_company_ids(self, company_id: int | None) -> list[int]:
        qs = CompanyGamificationConfig.objects.all()
        if company_id is not None:
            qs = qs.filter(company_id=company_id)
        if not self.force:
            qs = qs.filter(is_enabled=True)
        return list(qs.values_list("company_id", flat=True))

    def run(self, company_id: int | None = None) -> BackfillStats:
        if not self._status.is_globally_enabled():
            raise ValueError("Global feature flag gamification_enabled is off.")

        company_ids = self.resolve_company_ids(company_id)
        stats = BackfillStats(companies=len(company_ids))

        for cid in company_ids:
            self._backfill_company(cid, stats)

        return stats

    def _backfill_company(self, company_id: int, stats: BackfillStats):
        self._backfill_courses(company_id, stats.courses)
        self._backfill_assessments(company_id, stats.assessments)
        self._backfill_skill_upgrades(company_id, stats.skill_upgrades)
        self._backfill_certificates(company_id, stats.certificates)

        if self.include_badges:
            self._backfill_badges(company_id, stats)

    def _record_award(
        self,
        *,
        category: BackfillCategoryStats,
        employee_id: int,
        company_id: int,
        amount: int,
        rule_code: str,
        source_type: str,
        source_id: int,
        metadata: dict,
    ):
        category.processed += 1
        scaled = self._scale_points(amount)
        if scaled <= 0:
            category.skipped_zero += 1
            return

        if self._ledger.has_award(employee_id, rule_code, source_type, source_id):
            category.skipped += 1
            return

        if self.dry_run:
            category.created += 1
            return

        txn = self._ledger.credit_points(
            employee_id=employee_id,
            company_id=company_id,
            amount=scaled,
            rule_code=rule_code,
            source_type=source_type,
            source_id=source_id,
            metadata=self._backfill_metadata(metadata),
        )
        if txn:
            category.created += 1

    def _backfill_courses(self, company_id: int, category: BackfillCategoryStats):
        enrollments = (
            UserCourseEnrollment.objects.filter(
                employee__company_id=company_id,
                status=ProgressStatus.COMPLETED,
            )
            .select_related("employee", "course")
            .order_by("id")
        )
        for enrollment in enrollments:
            if self._ledger.has_award(
                enrollment.employee_id,
                AwardRuleCode.COURSE_COMPLETED,
                PointSourceType.ENROLLMENT,
                enrollment.id,
            ):
                category.skipped += 1
                category.processed += 1
                continue

            self._record_award(
                category=category,
                employee_id=enrollment.employee_id,
                company_id=company_id,
                amount=self._preview_course_points(enrollment, company_id),
                rule_code=AwardRuleCode.COURSE_COMPLETED,
                source_type=PointSourceType.ENROLLMENT,
                source_id=enrollment.id,
                metadata={
                    "course_id": enrollment.course_id,
                    "is_mandatory": bool(getattr(enrollment.course, "is_mandatory", False)),
                },
            )

    def _preview_course_points(self, enrollment, company_id: int) -> int:
        points = self._engine._base_points(AwardRuleCode.COURSE_COMPLETED, company_id)
        if getattr(enrollment.course, "is_mandatory", False):
            config = self._configs.get_by_company_id(company_id)
            multiplier = config.mandatory_course_xp_multiplier if config else Decimal("1.5")
            points = int(Decimal(points) * multiplier)
        return points

    def _backfill_assessments(self, company_id: int, category: BackfillCategoryStats):
        results = (
            AssessmentResult.objects.filter(
                status="PASS",
                attempt__employee__company_id=company_id,
            )
            .select_related("attempt", "attempt__employee")
            .order_by("attempt__employee_id", "attempt__assessment_id", "id")
        )
        pass_counts: dict[tuple[int, int], int] = {}

        for result in results:
            key = (result.attempt.employee_id, result.attempt.assessment_id)
            pass_counts[key] = pass_counts.get(key, 0) + 1
            pass_sequence = pass_counts[key]

            if self._ledger.has_award(
                result.attempt.employee_id,
                AwardRuleCode.ASSESSMENT_PASSED,
                PointSourceType.ASSESSMENT_RESULT,
                result.id,
            ):
                category.skipped += 1
                category.processed += 1
                continue

            amount = self._assessment_points(
                company_id,
                pass_sequence,
            )
            self._record_award(
                category=category,
                employee_id=result.attempt.employee_id,
                company_id=company_id,
                amount=amount,
                rule_code=AwardRuleCode.ASSESSMENT_PASSED,
                source_type=PointSourceType.ASSESSMENT_RESULT,
                source_id=result.id,
                metadata={
                    "assessment_id": result.attempt.assessment_id,
                    "attempt_id": str(result.attempt.id),
                    "pass_sequence": pass_sequence,
                    "score_percentage": float(result.score_percentage),
                },
            )

    def _assessment_points(self, company_id: int, pass_sequence: int) -> int:
        base = self._engine._base_points(AwardRuleCode.ASSESSMENT_PASSED, company_id)
        config = self._configs.get_by_company_id(company_id)
        if pass_sequence <= 1:
            pct = 100
        elif pass_sequence == 2:
            pct = config.retake_xp_percent_2nd if config else 40
        else:
            pct = config.retake_xp_percent_3rd_plus if config else 20
        return int(base * pct / 100)

    def _backfill_skill_upgrades(self, company_id: int, category: BackfillCategoryStats):
        proposals = (
            SkillUpgradeProposal.objects.filter(
                employee__company_id=company_id,
                status=SkillUpgradeStatus.APPROVED,
            )
            .select_related("employee")
            .order_by("id")
        )
        for proposal in proposals:
            if self._ledger.has_award(
                proposal.employee_id,
                AwardRuleCode.SKILL_UPGRADE_APPROVED,
                PointSourceType.SKILL_UPGRADE_PROPOSAL,
                proposal.id,
            ):
                category.skipped += 1
                category.processed += 1
                continue

            amount = self._engine._base_points(
                AwardRuleCode.SKILL_UPGRADE_APPROVED, company_id
            )
            self._record_award(
                category=category,
                employee_id=proposal.employee_id,
                company_id=company_id,
                amount=amount,
                rule_code=AwardRuleCode.SKILL_UPGRADE_APPROVED,
                source_type=PointSourceType.SKILL_UPGRADE_PROPOSAL,
                source_id=proposal.id,
                metadata={
                    "skill_id": proposal.skill_id,
                    "proposed_level_id": proposal.proposed_level_id,
                },
            )

    def _backfill_certificates(self, company_id: int, category: BackfillCategoryStats):
        certificates = (
            IssuedCertificate.objects.filter(employee__company_id=company_id)
            .select_related("employee")
            .order_by("id")
        )
        for certificate in certificates:
            if self._ledger.has_award(
                certificate.employee_id,
                AwardRuleCode.CERTIFICATE_ISSUED,
                PointSourceType.ISSUED_CERTIFICATE,
                certificate.id,
            ):
                category.skipped += 1
                category.processed += 1
                continue

            amount = self._engine._base_points(
                AwardRuleCode.CERTIFICATE_ISSUED, company_id
            )
            self._record_award(
                category=category,
                employee_id=certificate.employee_id,
                company_id=company_id,
                amount=amount,
                rule_code=AwardRuleCode.CERTIFICATE_ISSUED,
                source_type=PointSourceType.ISSUED_CERTIFICATE,
                source_id=certificate.id,
                metadata={
                    "certificate_type": certificate.certificate_type,
                    "entity_id": certificate.entity_id,
                },
            )

    @transaction.atomic
    def _backfill_badges(self, company_id: int, stats: BackfillStats):
        employees = EmployeeMaster.objects.filter(company_id=company_id).only("id")
        for employee in employees.iterator():
            stats.employees_badge_evaluated += 1
            if self.dry_run:
                continue
            awarded = self._badges.evaluate_for_employee(employee.id)
            stats.badges_awarded += len(awarded)
