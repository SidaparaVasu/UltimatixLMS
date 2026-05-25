from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal

from django.utils import timezone

from apps.assessment_engine.constants import SkillUpgradeStatus
from apps.assessment_engine.models import AssessmentResult, SkillUpgradeProposal
from apps.certificate_management.models import IssuedCertificate
from apps.gamification.constants import BadgeCriteriaType, StreakType
from apps.gamification.models import BadgeDefinition, EmployeeBadge, EmployeeStreak
from apps.gamification.repositories.badge_repository import (
    BadgeDefinitionRepository,
    EmployeeBadgeRepository,
)
from apps.gamification.services.gamification_status_service import GamificationStatusService
from apps.gamification.services.point_ledger_service import PointLedgerService
from apps.learning_progress.constants import ProgressStatus
from apps.learning_progress.models import LearningPathCourseMap, UserCourseEnrollment
from apps.org_management.models import EmployeeMaster


@dataclass
class NewBadgeAward:
    code: str
    name: str
    category: str
    icon_key: str
    earned_at: str


class BadgeEvaluator:
    def __init__(
        self,
        definition_repository: BadgeDefinitionRepository | None = None,
        employee_badge_repository: EmployeeBadgeRepository | None = None,
        status_service: GamificationStatusService | None = None,
        ledger: PointLedgerService | None = None,
    ):
        self._definitions = definition_repository or BadgeDefinitionRepository()
        self._earned = employee_badge_repository or EmployeeBadgeRepository()
        self._status = status_service or GamificationStatusService()
        self._ledger = ledger or PointLedgerService()

    def evaluate_for_employee(
        self,
        employee,
        *,
        context: dict | None = None,
    ) -> list[NewBadgeAward]:
        if isinstance(employee, int):
            employee = EmployeeMaster.objects.select_related("company").get(pk=employee)
        if not self._status.is_enabled_for_company(employee.company_id):
            return []

        context = context or {}
        earned_codes = self._earned.earned_codes_for_employee(employee.id)
        new_awards: list[NewBadgeAward] = []

        for definition in self._definitions.list_active():
            if definition.code in earned_codes:
                continue
            if not self._criteria_met(employee, definition, context):
                continue
            award = self._grant(employee, definition)
            if award:
                new_awards.append(award)
                earned_codes.add(definition.code)

        return new_awards

    def _grant(self, employee, definition: BadgeDefinition) -> NewBadgeAward | None:
        if self._earned.has_badge(employee.id, definition.id):
            return None
        row = EmployeeBadge.objects.create(
            employee_id=employee.id,
            company_id=employee.company_id,
            badge_id=definition.id,
        )
        return NewBadgeAward(
            code=definition.code,
            name=definition.name,
            category=definition.category,
            icon_key=definition.icon_key or definition.code.lower(),
            earned_at=row.earned_at.isoformat(),
        )

    def _criteria_met(self, employee, definition: BadgeDefinition, context: dict) -> bool:
        criteria_type = definition.criteria_type
        value = definition.criteria_value or {}

        if criteria_type == BadgeCriteriaType.COURSE_COMPLETED_COUNT:
            return self._course_completed_count(employee.id) >= self._int_value(value, "count", default=1)

        if criteria_type == BadgeCriteriaType.COURSE_COMPLETED_IN_DAYS:
            count = self._int_value(value, "count", default=3)
            days = self._int_value(value, "days", default=30)
            return self._course_completed_in_days(employee.id, count, days)

        if criteria_type == BadgeCriteriaType.MANDATORY_ALL_COMPLETE:
            return self._mandatory_all_complete(employee.id)

        if criteria_type == BadgeCriteriaType.COMPLIANCE_COURSE_COMPLETE:
            return self._compliance_course_complete(employee.id)

        if criteria_type == BadgeCriteriaType.OVERDUE_RECOVERY:
            return bool(context.get("overdue_recovery"))

        if criteria_type == BadgeCriteriaType.LEARNING_PATH_COMPLETE:
            path_id = context.get("learning_path_id")
            if path_id:
                return self._learning_path_complete(employee.id, path_id)
            return self._any_learning_path_complete(employee.id)

        if criteria_type == BadgeCriteriaType.ASSESSMENT_PASS_COUNT:
            return self._assessment_pass_count(employee.id) >= self._int_value(value, "count", default=1)

        if criteria_type == BadgeCriteriaType.ASSESSMENT_PERFECT_SCORE:
            return self._has_perfect_score(employee.id)

        if criteria_type == BadgeCriteriaType.ASSESSMENT_HIGH_SCORE_COUNT:
            min_score = Decimal(str(self._int_value(value, "min_score", default=90)))
            needed = self._int_value(value, "count", default=5)
            return self._high_score_pass_count(employee.id, min_score) >= needed

        if criteria_type == BadgeCriteriaType.ASSESSMENT_FIRST_TRY_PASS:
            return bool(context.get("first_try_pass"))

        if criteria_type == BadgeCriteriaType.STREAK_CURRENT:
            streak_type = value.get("streak_type", StreakType.LEARNING)
            min_days = self._int_value(value, "min_days", default=7)
            return self._streak_at_least(employee.id, streak_type, min_days)

        if criteria_type == BadgeCriteriaType.SKILL_UPGRADE_COUNT:
            return self._skill_upgrade_count(employee.id) >= self._int_value(value, "count", default=1)

        if criteria_type == BadgeCriteriaType.DISTINCT_SKILL_UPGRADE_COUNT:
            return self._distinct_skill_upgrade_count(employee.id) >= self._int_value(value, "count", default=3)

        if criteria_type == BadgeCriteriaType.CERTIFICATE_COUNT:
            return self._certificate_count(employee.id) >= self._int_value(value, "count", default=1)

        if criteria_type == BadgeCriteriaType.LIFETIME_XP:
            threshold = self._int_value(value, "threshold", default=1000)
            return self._ledger.get_balance(employee.id) >= threshold

        if criteria_type == BadgeCriteriaType.TOP_N_MONTHLY:
            rank_limit = self._int_value(value, "rank", default=10)
            return self._is_top_n_monthly(employee, rank_limit)

        return False

    @staticmethod
    def _int_value(value, key: str, *, default: int) -> int:
        if isinstance(value, (int, float)):
            return int(value)
        if isinstance(value, dict):
            raw = value.get(key, default)
            try:
                return int(raw)
            except (TypeError, ValueError):
                return default
        return default

    @staticmethod
    def _course_completed_count(employee_id: int) -> int:
        return UserCourseEnrollment.objects.filter(
            employee_id=employee_id,
            status=ProgressStatus.COMPLETED,
        ).count()

    @staticmethod
    def _course_completed_in_days(employee_id: int, needed: int, days: int) -> bool:
        since = timezone.now() - timedelta(days=days)
        count = UserCourseEnrollment.objects.filter(
            employee_id=employee_id,
            status=ProgressStatus.COMPLETED,
            completed_at__gte=since,
        ).count()
        return count >= needed

    @staticmethod
    def _mandatory_all_complete(employee_id: int) -> bool:
        qs = UserCourseEnrollment.objects.filter(
            employee_id=employee_id,
            course__is_mandatory=True,
        ).exclude(status=ProgressStatus.DROPPED)
        if not qs.exists():
            return False
        return not qs.exclude(status=ProgressStatus.COMPLETED).exists()

    @staticmethod
    def _compliance_course_complete(employee_id: int) -> bool:
        return UserCourseEnrollment.objects.filter(
            employee_id=employee_id,
            status=ProgressStatus.COMPLETED,
            course__compliance_requirements__isnull=False,
        ).exists()

    @staticmethod
    def _learning_path_complete(employee_id: int, path_id: int) -> bool:
        course_ids = list(
            LearningPathCourseMap.objects.filter(path_id=path_id).values_list("course_id", flat=True)
        )
        if not course_ids:
            return False
        completed = UserCourseEnrollment.objects.filter(
            employee_id=employee_id,
            learning_path_id=path_id,
            course_id__in=course_ids,
            status=ProgressStatus.COMPLETED,
        ).values("course_id").distinct().count()
        return completed >= len(course_ids)

    def _any_learning_path_complete(self, employee_id: int) -> bool:
        path_ids = (
            UserCourseEnrollment.objects.filter(
                employee_id=employee_id,
                learning_path_id__isnull=False,
            )
            .values_list("learning_path_id", flat=True)
            .distinct()
        )
        for path_id in path_ids:
            if self._learning_path_complete(employee_id, path_id):
                return True
        return False

    @staticmethod
    def _assessment_pass_count(employee_id: int) -> int:
        return AssessmentResult.objects.filter(
            attempt__employee_id=employee_id,
            status="PASS",
        ).count()

    @staticmethod
    def _has_perfect_score(employee_id: int) -> bool:
        return AssessmentResult.objects.filter(
            attempt__employee_id=employee_id,
            status="PASS",
            score_percentage__gte=Decimal("100"),
        ).exists()

    @staticmethod
    def _high_score_pass_count(employee_id: int, min_score: Decimal) -> int:
        return AssessmentResult.objects.filter(
            attempt__employee_id=employee_id,
            status="PASS",
            score_percentage__gte=min_score,
        ).count()

    @staticmethod
    def _streak_at_least(employee_id: int, streak_type: str, min_days: int) -> bool:
        streak = EmployeeStreak.objects.filter(
            employee_id=employee_id,
            streak_type=streak_type,
        ).first()
        if not streak:
            return False
        return streak.current_streak >= min_days

    @staticmethod
    def _skill_upgrade_count(employee_id: int) -> int:
        return SkillUpgradeProposal.objects.filter(
            employee_id=employee_id,
            status=SkillUpgradeStatus.APPROVED,
        ).count()

    @staticmethod
    def _distinct_skill_upgrade_count(employee_id: int) -> int:
        return (
            SkillUpgradeProposal.objects.filter(
                employee_id=employee_id,
                status=SkillUpgradeStatus.APPROVED,
            )
            .values("skill_id")
            .distinct()
            .count()
        )

    @staticmethod
    def _certificate_count(employee_id: int) -> int:
        return IssuedCertificate.objects.filter(employee_id=employee_id).count()

    @staticmethod
    def _is_top_n_monthly(employee, rank_limit: int) -> bool:
        from django.db.models import Sum

        from apps.gamification.models import PointTransaction

        now = timezone.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        ranked = (
            PointTransaction.objects.filter(
                company_id=employee.company_id,
                created_at__gte=month_start,
            )
            .values("employee_id")
            .annotate(period_xp=Sum("amount"))
            .order_by("-period_xp", "employee_id")
        )
        top_ids = [row["employee_id"] for row in ranked[:rank_limit]]
        return employee.id in top_ids
