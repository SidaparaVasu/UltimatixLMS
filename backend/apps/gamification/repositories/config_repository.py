from common.repositories.base import BaseRepository
from apps.gamification.models import CompanyGamificationConfig


class CompanyGamificationConfigRepository(BaseRepository):
    model = CompanyGamificationConfig

    def get_by_company_id(self, company_id: int):
        return self.filter(company_id=company_id).first()

    def get_or_create_for_company(self, company_id: int) -> tuple:
        return self.model.objects.get_or_create(company_id=company_id)
