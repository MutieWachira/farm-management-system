
from datetime import date
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.inventory_transaction import (
    InventoryMovementType,
    InventoryTransaction,
)
from app.schemas.inventory_transaction import InventoryTransactionCreate


class InventoryTransactionRepository:
    """Database operations for inventory stock-movement records."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(
        self,
        farm_id: UUID,
        item_id: UUID,
        data: InventoryTransactionCreate,
    ) -> InventoryTransaction:
        """Add a stock-movement record without committing the transaction."""
        transaction = InventoryTransaction(
            farm_id=farm_id,
            item_id=item_id,
            **data.model_dump(),
        )

        self.session.add(transaction)
        self.session.flush()

        return transaction

    def get_by_id_and_farm(
        self,
        transaction_id: UUID,
        farm_id: UUID,
    ) -> InventoryTransaction | None:
        """Find a movement record belonging to a specific farm."""
        statement = select(InventoryTransaction).where(
            InventoryTransaction.id == transaction_id,
            InventoryTransaction.farm_id == farm_id,
        )

        return self.session.scalar(statement)

    def list_by_farm(
        self,
        farm_id: UUID,
        *,
        item_id: UUID | None = None,
        movement_type: InventoryMovementType | None = None,
        start_date: date | None = None,
        end_date: date | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[InventoryTransaction]:
        """List stock movements with optional filters and pagination."""
        statement = select(InventoryTransaction).where(
            InventoryTransaction.farm_id == farm_id
        )

        if item_id is not None:
            statement = statement.where(
                InventoryTransaction.item_id == item_id
            )

        if movement_type is not None:
            statement = statement.where(
                InventoryTransaction.movement_type == movement_type.value
            )

        if start_date is not None:
            statement = statement.where(
                InventoryTransaction.transaction_date >= start_date
            )

        if end_date is not None:
            statement = statement.where(
                InventoryTransaction.transaction_date <= end_date
            )

        statement = (
            statement
            .order_by(
                InventoryTransaction.transaction_date.desc(),
                InventoryTransaction.created_at.desc(),
            )
            .limit(limit)
            .offset(offset)
        )

        return list(self.session.scalars(statement).all())
