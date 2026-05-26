from datetime import date

from common.repositories.base import BaseRepository
from apps.gamification.models import EmployeeStreak, StreakActivityLog


class EmployeeStreakRepository(BaseRepository):
    model = EmployeeStreak

    def get_for_employee(self, employee_id: int, streak_type: str):
        return self.filter(employee_id=employee_id, streak_type=streak_type).first()

    def get_or_create_streak(self, employee_id: int, company_id: int, streak_type: str):
        return self.model.objects.get_or_create(
            employee_id=employee_id,
            streak_type=streak_type,
            defaults={"company_id": company_id, "current_streak": 0, "longest_streak": 0},
        )

    def list_for_employee(self, employee_id: int):
        return self.filter(employee_id=employee_id)


class StreakActivityLogRepository(BaseRepository):
    model = StreakActivityLog

    def has_activity(self, employee_id: int, streak_type: str, activity_date: date) -> bool:
        return self.exists(
            employee_id=employee_id,
            streak_type=streak_type,
            activity_date=activity_date,
        )
