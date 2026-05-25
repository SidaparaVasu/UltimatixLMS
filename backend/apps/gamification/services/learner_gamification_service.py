from apps.gamification.models import PointBalance
from apps.gamification.repositories import PointTransactionRepository
from apps.gamification.services.gamification_status_service import GamificationStatusService
from apps.gamification.services.point_ledger_service import PointLedgerService
from apps.org_management.constants import EmploymentStatus
from apps.org_management.models import EmployeeMaster


class LearnerGamificationService:
    STREAK_PLACEHOLDER = {
        "learning": {"current": 0, "longest": 0},
        "pass_daily": {"current": 0, "longest": 0},
        "attempt_daily": {"current": 0, "longest": 0},
    }

    def __init__(
        self,
        ledger: PointLedgerService | None = None,
        transactions: PointTransactionRepository | None = None,
        status_service: GamificationStatusService | None = None,
    ):
        self._ledger = ledger or PointLedgerService()
        self._transactions = transactions or PointTransactionRepository()
        self._status = status_service or GamificationStatusService()

    def is_active_for_employee(self, employee) -> bool:
        return self._status.is_enabled_for_company(employee.company_id)

    def get_company_rank(self, employee) -> dict:
        lifetime_xp = self._ledger.get_balance(employee.id)
        higher_count = PointBalance.objects.filter(
            company_id=employee.company_id,
            lifetime_xp__gt=lifetime_xp,
        ).count()
        rank = higher_count + 1
        pool_size = EmployeeMaster.objects.filter(
            company_id=employee.company_id,
            employment_status=EmploymentStatus.ACTIVE,
        ).count()
        return {
            "rank": rank,
            "pool_size": pool_size,
        }

    def build_summary(self, employee) -> dict:
        rank_info = self.get_company_rank(employee)
        return {
            "lifetime_xp": self._ledger.get_balance(employee.id),
            "rank": rank_info["rank"],
            "pool_size": rank_info["pool_size"],
            "badges_count": 0,
            "streaks": self.STREAK_PLACEHOLDER,
            "recent_transactions": list(
                self._transactions.recent_for_employee(employee.id, limit=5)
            ),
        }

    def transactions_queryset(self, employee_id: int):
        return self._transactions.list_for_employee(employee_id)
