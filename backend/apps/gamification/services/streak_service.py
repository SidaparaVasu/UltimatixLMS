from datetime import date, timedelta

from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.gamification.constants import (
    STREAK_SOURCE_ID_OFFSET,
    AwardRuleCode,
    GamificationDefaults,
    PointSourceType,
    StreakType,
)
from apps.gamification.repositories import (
    CompanyGamificationConfigRepository,
    StreakActivityLogRepository,
)
from apps.gamification.repositories.streak_repository import (
    EmployeeStreakRepository,
)
from apps.gamification.services.award_engine import AwardEngine
from apps.gamification.services.gamification_status_service import GamificationStatusService
from apps.learning_progress.models import UserContentProgress


class StreakService:
    def __init__(
        self,
        streak_repository: EmployeeStreakRepository | None = None,
        activity_repository: StreakActivityLogRepository | None = None,
        config_repository: CompanyGamificationConfigRepository | None = None,
        status_service: GamificationStatusService | None = None,
        award_engine: AwardEngine | None = None,
    ):
        self._streaks = streak_repository or EmployeeStreakRepository()
        self._activity = activity_repository or StreakActivityLogRepository()
        self._configs = config_repository or CompanyGamificationConfigRepository()
        self._status = status_service or GamificationStatusService()
        self._awards = award_engine or AwardEngine()

    def _is_active(self, company_id: int) -> bool:
        return self._status.is_enabled_for_company(company_id)

    def _streak_source_id(self, streak_type: str, activity_date: date) -> int:
        offset = STREAK_SOURCE_ID_OFFSET.get(streak_type, 0)
        return int(activity_date.strftime("%Y%m%d")) * 10 + offset

    def _award_daily_bonus(self, employee, streak_type: str, activity_date: date):
        if streak_type not in StreakType.DAILY_TYPES:
            return
        self._awards._ledger.credit_points(
            employee_id=employee.id,
            company_id=employee.company_id,
            amount=self._awards._base_points(AwardRuleCode.STREAK_DAY_BONUS, employee.company_id),
            rule_code=AwardRuleCode.STREAK_DAY_BONUS,
            source_type=PointSourceType.STREAK,
            source_id=self._streak_source_id(streak_type, activity_date),
            metadata={"streak_type": streak_type, "activity_date": activity_date.isoformat()},
        )

    @transaction.atomic
    def record_calendar_streak(self, employee, streak_type: str, activity_date: date | None = None) -> bool:
        if streak_type not in StreakType.DAILY_TYPES:
            return False
        if not self._is_active(employee.company_id):
            return False

        activity_date = activity_date or timezone.localdate()
        if self._activity.has_activity(employee.id, streak_type, activity_date):
            return False

        self._activity.create(
            employee_id=employee.id,
            company_id=employee.company_id,
            streak_type=streak_type,
            activity_date=activity_date,
        )

        streak, _ = self._streaks.get_or_create_streak(
            employee.id, employee.company_id, streak_type
        )
        if streak.last_activity_date == activity_date:
            return True

        if streak.last_activity_date == activity_date - timedelta(days=1):
            streak.current_streak += 1
        else:
            streak.current_streak = 1

        streak.longest_streak = max(streak.longest_streak, streak.current_streak)
        streak.last_activity_date = activity_date
        streak.save(
            update_fields=["current_streak", "longest_streak", "last_activity_date", "updated_at"]
        )
        self._award_daily_bonus(employee, streak_type, activity_date)
        return True

    def try_record_learning_day(self, employee) -> bool:
        if not self._is_active(employee.company_id):
            return False

        today = timezone.localdate()
        if self._activity.has_activity(employee.id, StreakType.LEARNING, today):
            return False

        config = self._configs.get_by_company_id(employee.company_id)
        min_seconds = (
            config.learning_streak_min_seconds
            if config
            else GamificationDefaults.LEARNING_STREAK_MIN_SECONDS
        )

        qualified = UserContentProgress.objects.filter(
            lesson_progress__enrollment__employee_id=employee.id,
        ).filter(
            Q(is_completed=True, last_accessed_at__date=today)
            | Q(playhead_seconds__gte=min_seconds, last_accessed_at__date=today)
        ).exists()

        if not qualified:
            return False

        return self.record_calendar_streak(employee, StreakType.LEARNING, today)

    @transaction.atomic
    def increment_pass_consecutive(self, employee) -> int:
        if not self._is_active(employee.company_id):
            return 0

        streak, _ = self._streaks.get_or_create_streak(
            employee.id, employee.company_id, StreakType.PASS_CONSECUTIVE
        )
        streak.current_streak += 1
        streak.longest_streak = max(streak.longest_streak, streak.current_streak)
        streak.save(update_fields=["current_streak", "longest_streak", "updated_at"])
        return streak.current_streak

    @transaction.atomic
    def reset_pass_consecutive(self, employee) -> None:
        streak = self._streaks.get_for_employee(employee.id, StreakType.PASS_CONSECUTIVE)
        if not streak or streak.current_streak == 0:
            return
        streak.current_streak = 0
        streak.save(update_fields=["current_streak", "updated_at"])

    def break_stale_calendar_streaks(self, company_id: int | None = None) -> int:
        today = timezone.localdate()
        yesterday = today - timedelta(days=1)
        qs = self._streaks.filter(streak_type__in=StreakType.DAILY_TYPES)
        if company_id:
            qs = qs.filter(company_id=company_id)

        broken = 0
        for streak in qs.filter(current_streak__gt=0).exclude(last_activity_date=yesterday):
            if streak.last_activity_date is None or streak.last_activity_date < yesterday:
                streak.current_streak = 0
                streak.save(update_fields=["current_streak", "updated_at"])
                broken += 1
        return broken

    def build_streak_summary(self, employee_id: int) -> dict:
        defaults = {
            StreakType.LEARNING: {"current": 0, "longest": 0},
            StreakType.PASS_DAILY: {"current": 0, "longest": 0},
            StreakType.ATTEMPT_DAILY: {"current": 0, "longest": 0},
            StreakType.PASS_CONSECUTIVE: {"current": 0, "longest": 0},
        }
        key_map = {
            StreakType.LEARNING: "learning",
            StreakType.PASS_DAILY: "pass_daily",
            StreakType.ATTEMPT_DAILY: "attempt_daily",
            StreakType.PASS_CONSECUTIVE: "pass_consecutive",
        }
        summary = {
            "learning": defaults[StreakType.LEARNING].copy(),
            "pass_daily": defaults[StreakType.PASS_DAILY].copy(),
            "attempt_daily": defaults[StreakType.ATTEMPT_DAILY].copy(),
            "pass_consecutive": defaults[StreakType.PASS_CONSECUTIVE].copy(),
        }
        for streak in self._streaks.list_for_employee(employee_id):
            key = key_map.get(streak.streak_type)
            if key:
                summary[key] = {
                    "current": streak.current_streak,
                    "longest": streak.longest_streak,
                }
        return summary
