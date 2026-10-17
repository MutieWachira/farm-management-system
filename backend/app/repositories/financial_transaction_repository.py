
from datetime import date
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.financial_transaction import FinancialTransaction


class FinancialTransactionRepository:
    """Database access for farm financial transactions."""

    def __init__(self, db: Session) -> None:
        self.db = db

    def get_by_id(
        self,
        farm_id: UUID,
        transaction_id: UUID,
    ) -> FinancialTransaction | None:
        statement = select(FinancialTransaction).where(
            FinancialTransaction.id == transaction_id,
            FinancialTransaction.farm_id == farm_id,
        )
        return self.db.scalar(statement)

    def list_by_farm(
        self,
        farm_id: UUID,
        *,
        transaction_type: str | None = None,
        category: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[FinancialTransaction]:
        statement = select(FinancialTransaction).where(
            FinancialTransaction.farm_id == farm_id,
        )

        if transaction_type is not None:
            statement = statement.where(
                FinancialTransaction.transaction_type
                == transaction_type
            )

        if category is not None:
            statement = statement.where(
                FinancialTransaction.category == category
            )

        if start_date is not None:
            statement = statement.where(
                FinancialTransaction.transaction_date >= start_date
            )

        if end_date is not None:
            statement = statement.where(
                FinancialTransaction.transaction_date <= end_date
            )

        statement = (
            statement
            .order_by(
                FinancialTransaction.transaction_date.desc(),
                FinancialTransaction.created_at.desc(),
            )
            .limit(limit)
            .offset(offset)
        )

        return list(self.db.scalars(statement).all())

    def create(
        self,
        *,
        farm_id: UUID,
        created_by_id: UUID,
        transaction_type: str,
        category: str,
        amount: Decimal,
        currency_code: str,
        transaction_date: date,
        description: str | None,
        reference: str | None,
    ) -> FinancialTransaction:
        transaction = FinancialTransaction(
            farm_id=farm_id,
            created_by_id=created_by_id,
            transaction_type=transaction_type,
            category=category,
            amount=amount,
            currency_code=currency_code,
            transaction_date=transaction_date,
            description=description,
            reference=reference,
        )

        self.db.add(transaction)
        self.db.flush()
        self.db.refresh(transaction)

        return transaction

    def update(
        self,
        transaction: FinancialTransaction,
        changes: dict,
    ) -> FinancialTransaction:
        for field, value in changes.items():
            setattr(transaction, field, value)

        self.db.flush()
        self.db.refresh(transaction)

        return transaction

    def delete(self, transaction: FinancialTransaction) -> None:
        self.db.delete(transaction)
        self.db.flush()

    def totals_by_type_and_currency(
        self,
        farm_id: UUID,
    ) -> list[dict]:
        """Return totals grouped by type and currency.

        Keeping currencies separate prevents invalid cross-currency totals.
        """
        statement = (
            select(
                FinancialTransaction.transaction_type,
                FinancialTransaction.currency_code,
                func.sum(FinancialTransaction.amount).label("total"),
            )
            .where(FinancialTransaction.farm_id == farm_id)
            .group_by(
                FinancialTransaction.transaction_type,
                FinancialTransaction.currency_code,
            )
            .order_by(
                FinancialTransaction.currency_code,
                FinancialTransaction.transaction_type,
            )
        )

        rows = self.db.execute(statement).all()

        return [
            {
                "transaction_type": row.transaction_type,
                "currency_code": row.currency_code,
                "total": row.total or Decimal("0.00"),
            }
            for row in rows
        ]
