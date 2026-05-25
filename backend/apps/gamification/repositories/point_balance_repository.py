from django.db.models import F

from common.repositories.base import BaseRepository
from apps.gamification.models import PointBalance


class PointBalanceRepository(BaseRepository):
    model = PointBalance

    def get_by_employee_id(self, employee_id: int):
        return self.filter(employee_id=employee_id).first()

    def increment_xp(self, employee_id: int, company_id: int, amount: int) -> PointBalance:
        balance, created = self.model.objects.get_or_create(
            employee_id=employee_id,
            defaults={"company_id": company_id, "lifetime_xp": 0},
        )
        if created:
            if amount > 0:
                balance.lifetime_xp = amount
                balance.save(update_fields=["lifetime_xp", "updated_at"])
            return balance

        if balance.company_id != company_id:
            balance.company_id = company_id
            balance.save(update_fields=["company_id", "updated_at"])

        if amount != 0:
            balance.lifetime_xp = F("lifetime_xp") + amount
            balance.save(update_fields=["lifetime_xp", "updated_at"])
            balance.refresh_from_db()

        return balance
