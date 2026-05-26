"""Calendar period helpers for gamification leaderboards and monthly badges."""

from datetime import datetime

from django.db.models import Sum
from django.utils import timezone

from apps.gamification.models import PointTransaction


def month_bounds(year: int, month: int) -> tuple[datetime, datetime]:
    """Return [start, end) for the given calendar month in the active timezone."""
    tz = timezone.get_current_timezone()
    start = timezone.make_aware(datetime(year, month, 1), tz)
    if month == 12:
        end = timezone.make_aware(datetime(year + 1, 1, 1), tz)
    else:
        end = timezone.make_aware(datetime(year, month + 1, 1), tz)
    return start, end


def current_month_bounds() -> tuple[datetime, datetime]:
    now = timezone.now()
    return month_bounds(now.year, now.month)


def default_previous_year_month() -> tuple[int, int]:
    now = timezone.now()
    if now.month == 1:
        return now.year - 1, 12
    return now.year, now.month - 1


def top_employee_ids_for_period(
    company_id: int,
    period_start: datetime,
    period_end: datetime,
    rank_limit: int,
) -> list[int]:
    ranked = (
        PointTransaction.objects.filter(
            company_id=company_id,
            created_at__gte=period_start,
            created_at__lt=period_end,
        )
        .values("employee_id")
        .annotate(period_xp=Sum("amount"))
        .order_by("-period_xp", "employee_id")
    )
    return [row["employee_id"] for row in ranked[:rank_limit]]
