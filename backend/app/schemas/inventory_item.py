
from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field as PydanticField


class InventoryItemCreate(BaseModel):
    """Data required to create an inventory item."""

    name: str = PydanticField(min_length=2, max_length=150)
    category: str = PydanticField(min_length=2, max_length=50)
    sku: str | None = PydanticField(default=None, max_length=80)
    unit: str = PydanticField(min_length=1, max_length=30)
    reorder_level: Decimal = PydanticField(
        default=Decimal("0"),
        ge=0,
        max_digits=14,
        decimal_places=3,
    )
    description: str | None = PydanticField(
        default=None,
        max_length=5000,
    )


class InventoryItemUpdate(BaseModel):
    """Fields that can be changed on an inventory item."""

    name: str | None = PydanticField(default=None, min_length=2, max_length=150)
    category: str | None = PydanticField(default=None, min_length=2, max_length=50)
    sku: str | None = PydanticField(default=None, max_length=80)
    unit: str | None = PydanticField(default=None, min_length=1, max_length=30)
    reorder_level: Decimal | None = PydanticField(
        default=None,
        ge=0,
        max_digits=14,
        decimal_places=3,
    )
    description: str | None = PydanticField(default=None, max_length=5000)
    is_active: bool | None = None


class InventoryItemResponse(BaseModel):
    """Inventory item returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farm_id: UUID
    name: str
    category: str
    sku: str | None
    unit: str
    current_stock: Decimal
    reorder_level: Decimal
    description: str | None
    is_active: bool
    created_at: datetime
    updated_at: datetime
