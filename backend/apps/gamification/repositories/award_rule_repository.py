from common.repositories.base import BaseRepository
from apps.gamification.models import AwardRule


class AwardRuleRepository(BaseRepository):
    model = AwardRule

    def get_active_by_code(self, code: str, company_id: int | None = None):
        if company_id is not None:
            company_rule = (
                self.filter(code=code, company_id=company_id, is_active=True).first()
            )
            if company_rule:
                return company_rule
        return self.filter(code=code, company__isnull=True, is_active=True).first()
