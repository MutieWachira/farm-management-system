
from datetime import date
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.inventory_item import InventoryItem
from app.models.inventory_transaction import (
    InventoryMovementType,
    InventoryTransaction,
)
from app.repositories.inventory_item_repository import (
    InventoryItemRepository,
)
from app.repositories.inventory_transaction_repository import (
    InventoryTransactionRepository,
)
from app.schemas.inventory_transaction import InventoryTransactionCreate


class InventoryTransactionService:
    """Business logic for stock movements and inventory history."""

    def __init__(self, session: Session):
        self.session = session
        self.item_repository = InventoryItemRepository(session)
        self.transaction_repository = InventoryTransactionRepository(session)

    def create(
        self,
        farm_id: UUID,
        item_id: UUID,
        data: InventoryTransactionCreate,
    ) -> InventoryTransaction:
        """Record a movement and update stock atomically."""

        try:
            # Lock the item before reading its current balance.
            item = self.item_repository.get_by_id_and_farm_for_update(
                item_id=item_id,
                farm_id=farm_id,
            )

            if item is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Inventory item not found.",
                )

            if not item.is_active:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Cannot record movements for an inactive item.",
                )

            movement_type = data.movement_type
            quantity = data.quantity

            incoming_movements = {
                InventoryMovementType.RECEIVED,
                InventoryMovementType.ADJUSTMENT_IN,
            }

            outgoing_movements = {
                InventoryMovementType.USED,
                InventoryMovementType.ADJUSTMENT_OUT,
            }

            if movement_type in incoming_movements:
                new_stock = item.current_stock + quantity
            elif movement_type in outgoing_movements:
                new_stock = item.current_stock - quantity
            else:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Unsupported inventory movement type.",
                )

            if new_stock < 0:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Insufficient stock for this movement.",
                )

            # Both changes belong to the same database transaction.
            item.current_stock = new_stock
            self.session.flush()

            transaction = self.transaction_repository.create(
                farm_id=farm_id,
                item_id=item_id,
                data=data,
            )

            self.session.commit()

            self.session.refresh(item)
            self.session.refresh(transaction)

            return transaction

        except Exception:
            self.session.rollback()
            raise

    def get_by_id_and_farm(
        self,
        transaction_id: UUID,
        farm_id: UUID,
    ) -> InventoryTransaction:
        """Retrieve a movement within its farm boundary."""

        transaction = self.transaction_repository.get_by_id_and_farm(
            transaction_id=transaction_id,
            farm_id=farm_id,
        )

        if transaction is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory transaction not found.",
            )

        return transaction

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
        """Retrieve filtered and paginated movement history."""

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

        if start_date is not None and end_date is not None:
            if start_date > end_date:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Start date cannot be after end date.",
                )

        if item_id is not None:
            item = self.item_repository.get_by_id_and_farm(
                item_id=item_id,
                farm_id=farm_id,
            )

            if item is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Inventory item not found.",
                )

        return self.transaction_repository.list_by_farm(
            farm_id=farm_id,
            item_id=item_id,
            movement_type=movement_type,
            start_date=start_date,
            end_date=end_date,
            limit=limit,
            offset=offset,
        )
