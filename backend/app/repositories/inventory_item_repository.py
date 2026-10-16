from sqlalchemy import select
from uuid import UUID
from sqlalchemy.orm import Session
from app.models.inventory_item import InventoryItem
from app.schemas.inventory_item import (
    InventoryItemCreate,
    InventoryItemUpdate,
)

class InventoryItemRepository:
    """Database operations for farm inventory items."""
    def __init__(self, session: Session):
        self.session = session

    
    def create(
        self,
        farm_id: UUID,
        data: InventoryItemCreate,
    ) -> InventoryItem:
        """Create an inventory item belonging to a farm."""

        item = InventoryItem(
            farm_id=farm_id,
            **data.model_dump(),
        )

        self.session.add(item)
        self.session.flush()

        return item


    def get_by_id(self, item_id: UUID,) -> InventoryItem | None:
        """Retrieve an inventory item by its id"""
        statement = select(InventoryItem).where(InventoryItem.id == item_id,)

        return self.session.scalar(statement)

    def get_by_id_and_farm(self, item_id: UUID, farm_id: UUID) -> InventoryItem | None:
        """Retrieve an item only if it belongs to  the specified field"""
        statement = select(InventoryItem).where(InventoryItem.id == item_id, InventoryItem.farm_id == farm_id,)
        return self.session.scalar(statement)

    
    def get_by_id_and_farm_for_update(
        self,
        item_id: UUID,
        farm_id: UUID,
    ) -> InventoryItem | None:
        """Lock an inventory item while processing a stock movement."""

        statement = (
            select(InventoryItem)
            .where(
                InventoryItem.id == item_id,
                InventoryItem.farm_id == farm_id,
            )
            .with_for_update()
        )

        return self.session.scalar(statement)


    def get_by_sku_and_farm(self, sku: str, farm_id: UUID,) -> InventoryItem | None:
        """Find an item by SKU within a particular farm"""
        statement = select(InventoryItem).where(InventoryItem.sku == sku, InventoryItem.farm_id == farm_id,)
        return self.session.scalar(statement)

    def list_by_farm(self, farm_id: UUID, *, search: str| None = None,
                     category: str | None = None,is_active: bool | None = True,
                     low_stock_only: bool | None = False,limit: int = 50,
                     offset: int = 0,) -> list[InventoryItem]:
        """List farm inventory with optional filters and pagination"""
        statement = select(InventoryItem).where(InventoryItem.farm_id == farm_id,)
        if is_active is not None:
            statement = statement.where(InventoryItem.is_active == is_active,)
        if category is not None:
            statement = statement.where(InventoryItem.category == category,)
        if search:
            statement = statement.where(InventoryItem.name.ilike(f"%{search.strip()}%"),)
        if low_stock_only:
            statement = statement.where(InventoryItem.current_stock <= InventoryItem.reorder_level,)
            
        statement = ( statement.order_by(InventoryItem.name.asc(), 
                                             InventoryItem.created_at.desc(),
                                             )
                                             .limit(limit)
                                             .offset(offset)
                                             )
        return list(self.session.scalars(statement).all())


    def update(self, item: InventoryItem, data: InventoryItemUpdate) -> InventoryItem:
        """Update editable item field without changing stock directly"""
        updates = data.model_dump(exclude_unset=True)
        for field, value in updates.items():
            setattr(item, field, value)

        self.session.flush()
        return item
    
    def deactivate(self, item: InventoryItem,) -> InventoryItem:
        """Deactivate an item while preserving its transaction history"""
        item.is_active = False
        self.session.flush()
        return item