from common.repositories.base import BaseRepository
from apps.gamification.models import PointTransaction


class PointTransactionRepository(BaseRepository):
    model = PointTransaction

    def get_by_idempotency(
        self,
        employee_id: int,
        rule_code: str,
        source_type: str,
        source_id: int,
    ):
        return self.filter(
            employee_id=employee_id,
            rule_code=rule_code,
            source_type=source_type,
            source_id=source_id,
        ).first()

    def exists_idempotency(
        self,
        employee_id: int,
        rule_code: str,
        source_type: str,
        source_id: int,
    ) -> bool:
        return self.exists(
            employee_id=employee_id,
            rule_code=rule_code,
            source_type=source_type,
            source_id=source_id,
        )
