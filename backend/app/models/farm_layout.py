from typing import TYPE_CHECKING, Any
from uuid import UUID

from sqlalchemy import ForeignKey, JSON, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.farm import Farm


class FarmLayout(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    """Stores the visual layout of a farm without duplicating farm records."""

    __tablename__ = "farm_layouts"

    __table_args__ = (
        UniqueConstraint(
            "farm_id",
            name="uq_farm_layouts_farm_id",
        ),
    )

    farm_id: Mapped[UUID] = mapped_column(
        ForeignKey("farms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    layout_data: Mapped[dict[str, Any]] = mapped_column(
        JSON,
        nullable=False,
        default=lambda: {
            "schema_version": 1,
            "canvas": {"width": 1200, "height": 800},
            "fields": [],
        },
    )

    farm: Mapped["Farm"] = relationship(
        back_populates="layout",
    )
