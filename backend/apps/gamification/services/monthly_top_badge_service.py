"""
Awards TOP_N_MONTHLY badges (e.g. TOP_10_MONTH) for a closed calendar month.

Run via management command on the 1st of each month (or with --year/--month for backfill).
"""

from dataclasses import dataclass, field

from apps.gamification.constants import BadgeCriteriaType
from apps.gamification.models import BadgeDefinition, CompanyGamificationConfig
from apps.gamification.period_utils import (
    default_previous_year_month,
    month_bounds,
    top_employee_ids_for_period,
)
from apps.gamification.repositories.badge_repository import EmployeeBadgeRepository
from apps.gamification.services.badge_evaluator import BadgeEvaluator
from apps.gamification.services.gamification_status_service import GamificationStatusService
from apps.org_management.models import EmployeeMaster


@dataclass
class MonthlyTopBadgeStats:
    company_id: int
    year: int
    month: int
    rank_limit: int
    top_employee_ids: list[int] = field(default_factory=list)
    awarded: int = 0
    skipped_already_earned: int = 0
    dry_run: bool = False


@dataclass
class MonthlyTopBadgeRunStats:
    year: int
    month: int
    dry_run: bool
    companies_processed: int = 0
    total_awarded: int = 0
    total_skipped: int = 0
    by_company: list[MonthlyTopBadgeStats] = field(default_factory=list)


class MonthlyTopBadgeService:
    def __init__(
        self,
        badge_evaluator: BadgeEvaluator | None = None,
        employee_badge_repository: EmployeeBadgeRepository | None = None,
        status_service: GamificationStatusService | None = None,
    ):
        self._evaluator = badge_evaluator or BadgeEvaluator()
        self._earned = employee_badge_repository or EmployeeBadgeRepository()
        self._status = status_service or GamificationStatusService()

    @staticmethod
    def default_target_year_month() -> tuple[int, int]:
        return default_previous_year_month()

    def award_for_company(
        self,
        company_id: int,
        year: int,
        month: int,
        *,
        dry_run: bool = False,
    ) -> MonthlyTopBadgeStats:
        if not self._status.is_globally_enabled():
            return MonthlyTopBadgeStats(
                company_id=company_id,
                year=year,
                month=month,
                rank_limit=0,
                dry_run=dry_run,
            )

        definition = (
            BadgeDefinition.objects.filter(
                criteria_type=BadgeCriteriaType.TOP_N_MONTHLY,
                is_active=True,
            )
            .order_by("sort_order")
            .first()
        )
        if definition is None:
            return MonthlyTopBadgeStats(
                company_id=company_id,
                year=year,
                month=month,
                rank_limit=0,
                dry_run=dry_run,
            )

        rank_limit = BadgeEvaluator._int_value(definition.criteria_value, "rank", default=10)
        period_start, period_end = month_bounds(year, month)
        top_ids = top_employee_ids_for_period(
            company_id, period_start, period_end, rank_limit
        )

        stats = MonthlyTopBadgeStats(
            company_id=company_id,
            year=year,
            month=month,
            rank_limit=rank_limit,
            top_employee_ids=top_ids,
            dry_run=dry_run,
        )

        for employee_id in top_ids:
            if self._earned.has_badge(employee_id, definition.id):
                stats.skipped_already_earned += 1
                continue
            if dry_run:
                stats.awarded += 1
                continue

            employee = EmployeeMaster.objects.select_related("company").get(pk=employee_id)
            award = self._evaluator._grant(employee, definition)
            if award:
                stats.awarded += 1

        return stats

    def award_all_enabled_companies(
        self,
        year: int,
        month: int,
        *,
        company_id: int | None = None,
        dry_run: bool = False,
    ) -> MonthlyTopBadgeRunStats:
        run_stats = MonthlyTopBadgeRunStats(year=year, month=month, dry_run=dry_run)

        if company_id is not None:
            company_ids = [company_id]
        else:
            company_ids = list(
                CompanyGamificationConfig.objects.filter(is_enabled=True).values_list(
                    "company_id", flat=True
                )
            )

        for cid in company_ids:
            company_stats = self.award_for_company(cid, year, month, dry_run=dry_run)
            run_stats.by_company.append(company_stats)
            run_stats.companies_processed += 1
            run_stats.total_awarded += company_stats.awarded
            run_stats.total_skipped += company_stats.skipped_already_earned

        return run_stats
