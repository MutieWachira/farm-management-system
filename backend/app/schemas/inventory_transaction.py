
from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field as PydanticField

from app.models.inventory_transaction import InventoryMovementType


class InventoryTransactionCreate(BaseModel):
    """Data required to record a stock movement."""

    movement_type: InventoryMovementType
    quantity: Decimal = PydanticField(
        gt=0,
        max_digits=14,
        decimal_places=3,
    )
    unit_cost: Decimal | None = PydanticField(
        default=None,
        ge=0,
        max_digits=12,
        decimal_places=2,
    )
    transaction_date: date = PydanticField(default_factory=date.today)
    reference: str | None = PydanticField(default=None, max_length=150)
    notes: str | None = PydanticField(default=None, max_length=5000)


class InventoryTransactionResponse(BaseModel):
    """Stock movement returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farm_id: UUID
    item_id: UUID
    movement_type: InventoryMovementType
    quantity: Decimal
    unit_cost: Decimal | None
    transaction_date: date
    reference: str | None
    notes: str | None
    created_at: datetime
    updated_at: datetime
