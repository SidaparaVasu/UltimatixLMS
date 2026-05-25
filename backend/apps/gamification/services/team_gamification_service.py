from apps.gamification.repositories.badge_repository import EmployeeBadgeRepository
from apps.gamification.services.badge_catalog_service import BadgeCatalogService
from apps.gamification.services.leaderboard_service import LeaderboardService
from apps.gamification.services.learner_gamification_service import LearnerGamificationService
from apps.gamification.services.point_ledger_service import PointLedgerService
from apps.gamification.services.streak_service import StreakService
from apps.org_management.constants import EmploymentStatus
from apps.org_management.models import EmployeeMaster, EmployeeReportingManager


class TeamGamificationService:
    def __init__(
        self,
        learner_service: LearnerGamificationService | None = None,
        leaderboard_service: LeaderboardService | None = None,
        streak_service: StreakService | None = None,
        badge_service: BadgeCatalogService | None = None,
        badge_repository: EmployeeBadgeRepository | None = None,
        ledger: PointLedgerService | None = None,
    ):
        self._learner = learner_service or LearnerGamificationService()
        self._leaderboard = leaderboard_service or LeaderboardService()
        self._streaks = streak_service or StreakService()
        self._badges = badge_service or BadgeCatalogService()
        self._badge_repo = badge_repository or EmployeeBadgeRepository()
        self._ledger = ledger or PointLedgerService()

    def collect_reportee_ids(self, manager_id: int, company_id: int) -> set[int]:
        reportees: set[int] = set()
        frontier = [manager_id]
        while frontier:
            employee_ids = EmployeeReportingManager.objects.filter(
                manager_id__in=frontier,
                employee__company_id=company_id,
                employee__employment_status=EmploymentStatus.ACTIVE,
            ).values_list("employee_id", flat=True)
            new_ids = set(employee_ids) - reportees - {manager_id}
            if not new_ids:
                break
            reportees.update(new_ids)
            frontier = list(new_ids)
        return reportees

    def can_view_employee(self, manager, target_employee_id: int) -> bool:
        if target_employee_id == manager.id:
            return False
        return target_employee_id in self.collect_reportee_ids(
            manager.id, manager.company_id
        )

    def get_reportee_queryset(self, manager):
        reportee_ids = self.collect_reportee_ids(manager.id, manager.company_id)
        if not reportee_ids:
            return EmployeeMaster.objects.none()
        return (
            EmployeeMaster.objects.filter(
                id__in=reportee_ids,
                company_id=manager.company_id,
                employment_status=EmploymentStatus.ACTIVE,
            )
            .select_related("department", "business_unit", "job_role", "user__profile")
            .order_by("employee_code")
        )

    def build_team_list(self, manager) -> list[dict]:
        employees = list(self.get_reportee_queryset(manager))
        if not employees:
            return []

        employee_ids = [employee.id for employee in employees]
        badge_counts = self._badge_repo.counts_for_employees(employee_ids)
        rows = []
        for employee in employees:
            rank_info = self._learner.get_company_rank(employee)
            rows.append(
                {
                    "employee_id": employee.id,
                    "employee_code": employee.employee_code,
                    "display_name": self._leaderboard.employee_display_name(employee),
                    "department_name": (
                        employee.department.department_name if employee.department_id else ""
                    ),
                    "designation_name": (
                        employee.job_role.job_role_name if employee.job_role_id else ""
                    ),
                    "lifetime_xp": self._ledger.get_balance(employee.id),
                    "rank": rank_info["rank"],
                    "badges_count": badge_counts.get(employee.id, 0),
                    "streaks": self._streaks.build_streak_summary(employee.id),
                }
            )
        rows.sort(key=lambda row: (-row["lifetime_xp"], row["employee_code"]))
        return rows

    def build_member_detail(self, manager, target_employee_id: int) -> dict | None:
        if not self.can_view_employee(manager, target_employee_id):
            return None
        employee = (
            EmployeeMaster.objects.filter(
                pk=target_employee_id,
                company_id=manager.company_id,
            )
            .select_related("department", "job_role", "user__profile")
            .first()
        )
        if not employee:
            return None

        summary = self._learner.build_summary(employee)
        return {
            "employee_id": employee.id,
            "employee_code": employee.employee_code,
            "display_name": self._leaderboard.employee_display_name(employee),
            "department_name": (
                employee.department.department_name if employee.department_id else ""
            ),
            "designation_name": (
                employee.job_role.job_role_name if employee.job_role_id else ""
            ),
            "lifetime_xp": summary["lifetime_xp"],
            "rank": summary["rank"],
            "pool_size": summary["pool_size"],
            "badges_count": summary["badges_count"],
            "streaks": summary["streaks"],
            "badges": self._badges.list_earned_badges(employee.id),
            "recent_transactions": summary["recent_transactions"],
        }
