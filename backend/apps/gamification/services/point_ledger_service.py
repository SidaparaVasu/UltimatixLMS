from django.db import IntegrityError, transaction

from apps.gamification.models import PointTransaction
from apps.gamification.repositories import (
    PointBalanceRepository,
    PointTransactionRepository,
)


class DuplicatePointAwardError(Exception):
    pass


class PointLedgerService:
    def __init__(
        self,
        transaction_repository: PointTransactionRepository | None = None,
        balance_repository: PointBalanceRepository | None = None,
    ):
        self._transactions = transaction_repository or PointTransactionRepository()
        self._balances = balance_repository or PointBalanceRepository()

    def get_balance(self, employee_id: int) -> int:
        balance = self._balances.get_by_employee_id(employee_id)
        return balance.lifetime_xp if balance else 0

    def get_balance_record(self, employee_id: int):
        return self._balances.get_by_employee_id(employee_id)

    def has_award(
        self,
        employee_id: int,
        rule_code: str,
        source_type: str,
        source_id: int,
    ) -> bool:
        return self._transactions.exists_idempotency(
            employee_id, rule_code, source_type, source_id
        )

    @transaction.atomic
    def credit_points(
        self,
        *,
        employee_id: int,
        company_id: int,
        amount: int,
        rule_code: str,
        source_type: str,
        source_id: int,
        metadata: dict | None = None,
        raise_on_duplicate: bool = False,
    ) -> PointTransaction | None:
        if amount == 0:
            return None

        if self.has_award(employee_id, rule_code, source_type, source_id):
            if raise_on_duplicate:
                raise DuplicatePointAwardError(
                    f"Award already exists: {rule_code}/{source_type}/{source_id}"
                )
            return self._transactions.get_by_idempotency(
                employee_id, rule_code, source_type, source_id
            )

        try:
            txn = self._transactions.create(
                employee_id=employee_id,
                company_id=company_id,
                amount=amount,
                rule_code=rule_code,
                source_type=source_type,
                source_id=source_id,
                metadata=metadata or {},
            )
            self._balances.increment_xp(employee_id, company_id, amount)
            return txn
        except IntegrityError:
            if raise_on_duplicate:
                raise DuplicatePointAwardError(
                    f"Award already exists: {rule_code}/{source_type}/{source_id}"
                )
            return self._transactions.get_by_idempotency(
                employee_id, rule_code, source_type, source_id
            )
