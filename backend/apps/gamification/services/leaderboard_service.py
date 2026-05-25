from datetime import timedelta

from django.db.models import IntegerField, Q, Sum, Value
from django.db.models.functions import Coalesce
from django.utils import timezone

from apps.gamification.constants import GamificationDefaults, LeaderboardPeriod
from apps.gamification.models import PointTransaction
from apps.gamification.repositories import CompanyGamificationConfigRepository
from apps.org_management.constants import EmploymentStatus
from apps.org_management.models import EmployeeMaster


class LeaderboardService:
    def __init__(self, config_repository: CompanyGamificationConfigRepository | None = None):
        self._configs = config_repository or CompanyGamificationConfigRepository()

    def _inactive_days(self, company_id: int) -> int:
        config = self._configs.get_by_company_id(company_id)
        if config:
            return config.inactive_leaderboard_days
        return GamificationDefaults.INACTIVE_LEADERBOARD_DAYS

    def _period_start(self, period: str):
        now = timezone.now()
        if period == LeaderboardPeriod.WEEKLY:
            return now - timedelta(days=7)
        if period == LeaderboardPeriod.MONTHLY:
            return now - timedelta(days=30)
        return None

    def _normalize_period(self, period: str | None) -> str:
        if period in LeaderboardPeriod.CHOICES:
            return period
        return LeaderboardPeriod.DEFAULT

    def _base_employee_queryset(
        self,
        company_id: int,
        *,
        department_id: int | None = None,
        business_unit_id: int | None = None,
        designation_id: int | None = None,
    ):
        qs = EmployeeMaster.objects.filter(
            company_id=company_id,
            employment_status=EmploymentStatus.ACTIVE,
        ).select_related(
            "department",
            "business_unit",
            "job_role",
            "user__profile",
        )
        if department_id:
            qs = qs.filter(department_id=department_id)
        if business_unit_id:
            qs = qs.filter(business_unit_id=business_unit_id)
        if designation_id:
            qs = qs.filter(job_role_id=designation_id)
        return qs

    def _apply_inactive_exclusion(self, qs, company_id: int):
        cutoff = timezone.now() - timedelta(days=self._inactive_days(company_id))
        active_ids = (
            PointTransaction.objects.filter(
                company_id=company_id,
                created_at__gte=cutoff,
            )
            .values_list("employee_id", flat=True)
            .distinct()
        )
        return qs.filter(id__in=active_ids)

    def _annotate_period_xp(self, qs, company_id: int, period: str):
        zero = Value(0, output_field=IntegerField())
        if period == LeaderboardPeriod.ALL_TIME:
            return qs.annotate(
                period_xp=Coalesce("point_balance__lifetime_xp", zero),
            )

        period_start = self._period_start(period)
        return qs.annotate(
            period_xp=Coalesce(
                Sum(
                    "point_transactions__amount",
                    filter=Q(
                        point_transactions__company_id=company_id,
                        point_transactions__created_at__gte=period_start,
                    ),
                ),
                zero,
            ),
        )

    def build_leaderboard_queryset(
        self,
        company_id: int,
        *,
        period: str | None = None,
        department_id: int | None = None,
        business_unit_id: int | None = None,
        designation_id: int | None = None,
    ):
        period = self._normalize_period(period)
        qs = self._base_employee_queryset(
            company_id,
            department_id=department_id,
            business_unit_id=business_unit_id,
            designation_id=designation_id,
        )
        qs = self._apply_inactive_exclusion(qs, company_id)
        qs = self._annotate_period_xp(qs, company_id, period)
        return qs.filter(period_xp__gt=0).order_by("-period_xp", "id")

    def resolve_rank(
        self,
        company_id: int,
        employee_id: int,
        *,
        period: str | None = None,
        department_id: int | None = None,
        business_unit_id: int | None = None,
        designation_id: int | None = None,
    ) -> dict | None:
        period = self._normalize_period(period)
        ordered_ids = list(
            self.build_leaderboard_queryset(
                company_id,
                period=period,
                department_id=department_id,
                business_unit_id=business_unit_id,
                designation_id=designation_id,
            ).values_list("id", "period_xp")
        )
        for index, (emp_id, period_xp) in enumerate(ordered_ids, start=1):
            if emp_id == employee_id:
                return {
                    "rank": index,
                    "period_xp": period_xp,
                    "pool_size": len(ordered_ids),
                }
        return None

    @staticmethod
    def employee_display_name(employee) -> str:
        user = getattr(employee, "user", None)
        profile = getattr(user, "profile", None) if user else None
        if profile:
            name = f"{profile.first_name} {profile.last_name}".strip()
            if name:
                return name
        return employee.employee_code

    def serialize_entries(self, employees, *, rank_offset: int = 0) -> list[dict]:
        rows = []
        for index, employee in enumerate(employees, start=rank_offset + 1):
            rows.append(
                {
                    "rank": index,
                    "employee_id": employee.id,
                    "employee_code": employee.employee_code,
                    "display_name": self.employee_display_name(employee),
                    "department_name": employee.department.department_name if employee.department_id else "",
                    "business_unit_name": (
                        employee.business_unit.business_unit_name if employee.business_unit_id else ""
                    ),
                    "designation_name": employee.job_role.job_role_name if employee.job_role_id else "",
                    "period_xp": int(getattr(employee, "period_xp", 0) or 0),
                    "badges_count": 0,
                }
            )
        return rows
