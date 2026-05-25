from dataclasses import dataclass, field
from decimal import Decimal

from apps.assessment_engine.models import AssessmentResult
from apps.gamification.constants import AwardRuleCode, PointSourceType
from apps.gamification.models import PointTransaction
from apps.gamification.repositories import (
    AwardRuleRepository,
    CompanyGamificationConfigRepository,
)
from apps.gamification.services.badge_evaluator import BadgeEvaluator
from apps.gamification.services.gamification_status_service import GamificationStatusService
from apps.gamification.services.point_ledger_service import PointLedgerService


@dataclass
class AwardOutcome:
    transaction: PointTransaction | None
    new_badges: list[dict] = field(default_factory=list)


class AwardEngine:
    def __init__(
        self,
        ledger: PointLedgerService | None = None,
        rule_repository: AwardRuleRepository | None = None,
        config_repository: CompanyGamificationConfigRepository | None = None,
        status_service: GamificationStatusService | None = None,
        badge_evaluator: BadgeEvaluator | None = None,
    ):
        self._ledger = ledger or PointLedgerService()
        self._rules = rule_repository or AwardRuleRepository()
        self._configs = config_repository or CompanyGamificationConfigRepository()
        self._status = status_service or GamificationStatusService()
        self._badges = badge_evaluator or BadgeEvaluator()

    def _is_active(self, company_id: int) -> bool:
        return self._status.is_enabled_for_company(company_id)

    def _company_config(self, company_id: int):
        return self._configs.get_by_company_id(company_id)

    def _base_points(self, rule_code: str, company_id: int) -> int:
        rule = self._rules.get_active_by_code(rule_code, company_id)
        if not rule:
            return 0
        return int(Decimal(rule.base_points) * rule.multiplier)

    def _finalize_award(self, employee, transaction, badge_context: dict | None = None) -> AwardOutcome:
        from dataclasses import asdict

        context = badge_context or {}
        new_badges = self._badges.evaluate_for_employee(employee, context=context)
        return AwardOutcome(
            transaction=transaction,
            new_badges=[asdict(badge) for badge in new_badges],
        )

    def award_course_completed(
        self, enrollment, *, badge_context: dict | None = None
    ) -> AwardOutcome:
        employee = enrollment.employee
        company_id = employee.company_id
        if not self._is_active(company_id):
            return AwardOutcome(None, [])

        points = self._base_points(AwardRuleCode.COURSE_COMPLETED, company_id)
        if points <= 0:
            return self._finalize_award(employee, None, badge_context)

        course = enrollment.course
        if getattr(course, "is_mandatory", False):
            config = self._company_config(company_id)
            multiplier = (
                config.mandatory_course_xp_multiplier
                if config
                else Decimal("1.5")
            )
            points = int(Decimal(points) * multiplier)

        txn = self._ledger.credit_points(
            employee_id=employee.id,
            company_id=company_id,
            amount=points,
            rule_code=AwardRuleCode.COURSE_COMPLETED,
            source_type=PointSourceType.ENROLLMENT,
            source_id=enrollment.id,
            metadata={
                "course_id": enrollment.course_id,
                "is_mandatory": bool(getattr(course, "is_mandatory", False)),
            },
        )
        ctx = dict(badge_context or {})
        if enrollment.learning_path_id:
            ctx.setdefault("learning_path_id", enrollment.learning_path_id)
        return self._finalize_award(employee, txn, ctx)

    def award_assessment_passed(
        self, result: AssessmentResult, *, badge_context: dict | None = None
    ) -> AwardOutcome:
        if result.status != "PASS":
            return AwardOutcome(None, [])

        attempt = result.attempt
        employee = attempt.employee
        company_id = employee.company_id
        if not self._is_active(company_id):
            return AwardOutcome(None, [])

        base = self._base_points(AwardRuleCode.ASSESSMENT_PASSED, company_id)
        if base <= 0:
            return self._finalize_award(employee, None, badge_context)

        prior_passes = AssessmentResult.objects.filter(
            attempt__employee_id=employee.id,
            attempt__assessment_id=attempt.assessment_id,
            status="PASS",
        ).exclude(pk=result.pk).count()
        pass_sequence = prior_passes + 1

        config = self._company_config(company_id)
        if pass_sequence <= 1:
            pct = 100
        elif pass_sequence == 2:
            pct = config.retake_xp_percent_2nd if config else 40
        else:
            pct = config.retake_xp_percent_3rd_plus if config else 20

        points = int(base * pct / 100)
        if points <= 0:
            return self._finalize_award(employee, None, badge_context)

        txn = self._ledger.credit_points(
            employee_id=employee.id,
            company_id=company_id,
            amount=points,
            rule_code=AwardRuleCode.ASSESSMENT_PASSED,
            source_type=PointSourceType.ASSESSMENT_RESULT,
            source_id=result.id,
            metadata={
                "assessment_id": attempt.assessment_id,
                "attempt_id": str(attempt.id),
                "pass_sequence": pass_sequence,
                "score_percentage": float(result.score_percentage),
            },
        )
        return self._finalize_award(employee, txn, badge_context)

    def award_skill_upgrade_approved(
        self, proposal, *, badge_context: dict | None = None
    ) -> AwardOutcome:
        employee = proposal.employee
        company_id = employee.company_id
        if not self._is_active(company_id):
            return AwardOutcome(None, [])

        points = self._base_points(AwardRuleCode.SKILL_UPGRADE_APPROVED, company_id)
        if points <= 0:
            return self._finalize_award(employee, None, badge_context)

        txn = self._ledger.credit_points(
            employee_id=employee.id,
            company_id=company_id,
            amount=points,
            rule_code=AwardRuleCode.SKILL_UPGRADE_APPROVED,
            source_type=PointSourceType.SKILL_UPGRADE_PROPOSAL,
            source_id=proposal.id,
            metadata={
                "skill_id": proposal.skill_id,
                "proposed_level_id": proposal.proposed_level_id,
            },
        )
        return self._finalize_award(employee, txn, badge_context)

    def award_certificate_issued(
        self, certificate, *, badge_context: dict | None = None
    ) -> AwardOutcome:
        employee = certificate.employee
        company_id = employee.company_id
        if not self._is_active(company_id):
            return AwardOutcome(None, [])

        points = self._base_points(AwardRuleCode.CERTIFICATE_ISSUED, company_id)
        if points <= 0:
            return self._finalize_award(employee, None, badge_context)

        txn = self._ledger.credit_points(
            employee_id=employee.id,
            company_id=company_id,
            amount=points,
            rule_code=AwardRuleCode.CERTIFICATE_ISSUED,
            source_type=PointSourceType.ISSUED_CERTIFICATE,
            source_id=certificate.id,
            metadata={
                "certificate_type": certificate.certificate_type,
                "entity_id": certificate.entity_id,
            },
        )
        return self._finalize_award(employee, txn, badge_context)
