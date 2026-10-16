
from decimal import Decimal
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.farm import Farm
    from app.models.inventory_transaction import InventoryTransaction


class InventoryItem(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """A supply item maintained in a farm's inventory."""

    __tablename__ = "inventory_items"

    __table_args__ = (
        CheckConstraint(
            "current_stock >= 0",
            name="ck_inventory_items_stock_nonnegative",
        ),
        CheckConstraint(
            "reorder_level >= 0",
            name="ck_inventory_items_reorder_nonnegative",
        ),
        UniqueConstraint(
            "farm_id",
            "sku",
            name="uq_inventory_items_farm_sku",
        ),
        Index(
            "ix_inventory_items_farm_name",
            "farm_id",
            "name",
        ),
    )

    farm_id: Mapped[UUID] = mapped_column(
        ForeignKey("farms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    sku: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
    )

    unit: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
    )

    current_stock: Mapped[Decimal] = mapped_column(
        Numeric(14, 3),
        nullable=False,
        default=Decimal("0"),
    )

    reorder_level: Mapped[Decimal] = mapped_column(
        Numeric(14, 3),
        nullable=False,
        default=Decimal("0"),
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    is_active: Mapped[bool] = mapped_column(
        nullable=False,
        default=True,
    )

    farm: Mapped["Farm"] = relationship(
        back_populates="inventory_items",
    )

    transactions: Mapped[list["InventoryTransaction"]] = relationship(
        back_populates="item",
        passive_deletes="all",
    )
