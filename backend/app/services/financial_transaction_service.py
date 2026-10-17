
from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.financial_transaction import FinancialTransaction
from app.repositories.financial_transaction_repository import (
    FinancialTransactionRepository,
)
from app.schemas.financial_transaction import (
    FinancialTransactionCreate,
    FinancialTransactionUpdate,
    validate_category,
)


class FinancialTransactionService:
    """Business logic for farm financial transactions."""

    def __init__(self, db: Session) -> None:
        self.db = db
        self.repository = FinancialTransactionRepository(db)

    def create(
        self,
        *,
        farm_id: UUID,
        created_by_id: UUID,
        data: FinancialTransactionCreate,
    ) -> FinancialTransaction:
        validate_category(data.transaction_type, data.category)

        try:
            transaction = self.repository.create(
                farm_id=farm_id,
                created_by_id=created_by_id,
                **data.model_dump(),
            )
            self.db.commit()
            self.db.refresh(transaction)
            return transaction
        except SQLAlchemyError:
            self.db.rollback()
            raise

    def get(
        self,
        *,
        farm_id: UUID,
        transaction_id: UUID,
    ) -> FinancialTransaction:
        transaction = self.repository.get_by_id(
            farm_id,
            transaction_id,
        )

        if transaction is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Financial transaction not found.",
            )

        return transaction

    def list_transactions(
        self,
        *,
        farm_id: UUID,
        transaction_type: str | None = None,
        category: str | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[FinancialTransaction]:
        if start_date and end_date and start_date > end_date:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Start date must not be after end date.",
            )

        if not 1 <= limit <= 100:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Limit must be between 1 and 100.",
            )

        if offset < 0:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Offset cannot be negative.",
            )

        return self.repository.list_by_farm(
            farm_id,
            transaction_type=transaction_type,
            category=category,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset,
        )

    def update(
        self,
        *,
        farm_id: UUID,
        transaction_id: UUID,
        data: FinancialTransactionUpdate,
    ) -> FinancialTransaction:
        transaction = self.get(
            farm_id=farm_id,
            transaction_id=transaction_id,
        )

        changes = data.model_dump(exclude_unset=True)

        # Null means "leave unchanged" for required fields.
        # Description and reference can explicitly be cleared.
        for field in (
            "transaction_type",
            "category",
            "amount",
            "currency_code",
            "transaction_date",
        ):
            if changes.get(field) is None:
                changes.pop(field, None)

        if not changes:
            return transaction

        new_type = changes.get(
            "transaction_type",
            transaction.transaction_type,
        )
        new_category = changes.get(
            "category",
            transaction.category,
        )

        try:
            validate_category(new_type, new_category)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=str(exc),
            ) from exc

        try:
            updated = self.repository.update(transaction, changes)
            self.db.commit()
            self.db.refresh(updated)
            return updated
        except SQLAlchemyError:
            self.db.rollback()
            raise

    def delete(
        self,
        *,
        farm_id: UUID,
        transaction_id: UUID,
    ) -> None:
        transaction = self.get(
            farm_id=farm_id,
            transaction_id=transaction_id,
        )

        try:
            self.repository.delete(transaction)
            self.db.commit()
        except SQLAlchemyError:
            self.db.rollback()
            raise

    def get_totals(self, *, farm_id: UUID) -> list[dict]:
        return self.repository.totals_by_type_and_currency(farm_id)
