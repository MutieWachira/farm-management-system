
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.inventory_item import InventoryItem
from app.repositories.inventory_item_repository import (
    InventoryItemRepository,
)
from app.schemas.inventory_item import (
    InventoryItemCreate,
    InventoryItemUpdate,
)


class InventoryItemService:
    """Business logic for farm inventory items."""

    def __init__(self, session: Session):
        self.session = session
        self.repository = InventoryItemRepository(session)

    def create(
        self,
        farm_id: UUID,
        data: InventoryItemCreate,
    ) -> InventoryItem:
        """Create an item with zero initial stock."""

        if data.sku is not None:
            existing = self.repository.get_by_sku_and_farm(
                sku=data.sku,
                farm_id=farm_id,
            )

            if existing is not None:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An inventory item with this SKU already exists.",
                )

        try:
            item = self.repository.create(
                farm_id=farm_id,
                data=data,
            )

            self.session.commit()
            self.session.refresh(item)

            return item

        except IntegrityError as exc:
            self.session.rollback()

            constraint_name = getattr(
                getattr(exc.orig, "diag", None),
                "constraint_name",
                None,
            )

            if constraint_name == "uq_inventory_items_farm_sku":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An inventory item with this SKU already exists.",
                ) from exc

            raise

    def get_by_id_and_farm(
        self,
        item_id: UUID,
        farm_id: UUID,
    ) -> InventoryItem:
        """Retrieve an item within its farm boundary."""

        item = self.repository.get_by_id_and_farm(
            item_id=item_id,
            farm_id=farm_id,
        )

        if item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Inventory item not found.",
            )

        return item

    def list_by_farm(
        self,
        farm_id: UUID,
        *,
        search: str | None = None,
        category: str | None = None,
        is_active: bool | None = True,
        low_stock_only: bool = False,
        limit: int = 50,
        offset: int = 0,
    ) -> list[InventoryItem]:
        """List inventory items with bounded pagination."""

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
            farm_id=farm_id,
            search=search,
            category=category,
            is_active=is_active,
            low_stock_only=low_stock_only,
            limit=limit,
            offset=offset,
        )

    def update(
        self,
        item_id: UUID,
        farm_id: UUID,
        data: InventoryItemUpdate,
    ) -> InventoryItem:
        """Update item details without changing its stock balance."""

        item = self.get_by_id_and_farm(
            item_id=item_id,
            farm_id=farm_id,
        )

        updates = data.model_dump(exclude_unset=True)

        # Required database columns must not be set to NULL.
        required_fields = {
            "name",
            "category",
            "unit",
            "reorder_level",
            "is_active",
        }

        for field in required_fields:
            if field in updates and updates[field] is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=f"{field} cannot be null.",
                )

        new_sku = updates.get("sku")

        if new_sku is not None:
            existing = self.repository.get_by_sku_and_farm(
                sku=new_sku,
                farm_id=farm_id,
            )

            if existing is not None and existing.id != item.id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An inventory item with this SKU already exists.",
                )

        try:
            self.repository.update(
                item=item,
                data=data,
            )

            self.session.commit()
            self.session.refresh(item)

            return item

        except IntegrityError as exc:
            self.session.rollback()

            constraint_name = getattr(
                getattr(exc.orig, "diag", None),
                "constraint_name",
                None,
            )

            if constraint_name == "uq_inventory_items_farm_sku":
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="An inventory item with this SKU already exists.",
                ) from exc

            raise

    def deactivate(
        self,
        item_id: UUID,
        farm_id: UUID,
    ) -> InventoryItem:
        """Deactivate an item while retaining its history."""

        item = self.get_by_id_and_farm(
            item_id=item_id,
            farm_id=farm_id,
        )

        self.repository.deactivate(item)

        self.session.commit()
        self.session.refresh(item)

        return item
