from common.repositories.base import BaseRepository
from apps.gamification.models import BadgeDefinition, EmployeeBadge


class BadgeDefinitionRepository(BaseRepository):
    model = BadgeDefinition

    def list_active(self):
        return self.filter(is_active=True).order_by("sort_order", "code")

    def get_by_code(self, code: str):
        return self.filter(code=code, is_active=True).first()


class EmployeeBadgeRepository(BaseRepository):
    model = EmployeeBadge

    def earned_codes_for_employee(self, employee_id: int) -> set[str]:
        return set(
            self.filter(employee_id=employee_id).values_list("badge__code", flat=True)
        )

    def count_for_employee(self, employee_id: int) -> int:
        return self.filter(employee_id=employee_id).count()

    def counts_for_employees(self, employee_ids: list[int]) -> dict[int, int]:
        if not employee_ids:
            return {}
        from django.db.models import Count

        rows = (
            self.filter(employee_id__in=employee_ids)
            .values("employee_id")
            .annotate(total=Count("id"))
        )
        return {row["employee_id"]: row["total"] for row in rows}

    def list_for_employee(self, employee_id: int):
        return (
            self.filter(employee_id=employee_id)
            .select_related("badge")
            .order_by("-earned_at")
        )

    def has_badge(self, employee_id: int, badge_id: int) -> bool:
        return self.filter(employee_id=employee_id, badge_id=badge_id).exists()
