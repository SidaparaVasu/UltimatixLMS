from apps.gamification.repositories.badge_repository import (
    BadgeDefinitionRepository,
    EmployeeBadgeRepository,
)


class BadgeCatalogService:
    def __init__(
        self,
        definitions: BadgeDefinitionRepository | None = None,
        earned: EmployeeBadgeRepository | None = None,
    ):
        self._definitions = definitions or BadgeDefinitionRepository()
        self._earned = earned or EmployeeBadgeRepository()

    def build_catalog(self, employee_id: int) -> list[dict]:
        earned_codes = self._earned.earned_codes_for_employee(employee_id)
        rows = []
        for badge in self._definitions.list_active():
            rows.append(self._serialize_definition(badge, badge.code in earned_codes))
        return rows

    def list_earned_badges(self, employee_id: int) -> list[dict]:
        rows = []
        for award in self._earned.list_for_employee(employee_id):
            rows.append(
                {
                    **self._serialize_definition(award.badge, True),
                    "earned_at": award.earned_at,
                }
            )
        return rows

    @staticmethod
    def _serialize_definition(badge, is_earned: bool) -> dict:
        return {
            "code": badge.code,
            "name": badge.name,
            "description": badge.description,
            "category": badge.category,
            "criteria_type": badge.criteria_type,
            "icon_key": badge.icon_key or badge.code.lower(),
            "sort_order": badge.sort_order,
            "is_earned": is_earned,
        }
