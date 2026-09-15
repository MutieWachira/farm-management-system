from datetime import datetime
from enum import Enum
import string
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Date, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.field import Field


class CropStatus(str, Enum):
    """Possible lifecycle states of a crop."""
    PLANNED = "PLANNED"
    PLANTED = "PLANTED"
    GROWING = "GROWING"
    HARVESTED = "HARVESTED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class Crop(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Represents a crop planted or planned on a field"""
    __tablename__ = "crops"

    field_id : Mapped[UUID] = mapped_column(
        ForeignKey("fields.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    variety: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    planting_date: Mapped[datetime | None] = mapped_column(
        Date,
        nullable=False,
    )

    expected_harvest_date: Mapped[datetime | None] = mapped_column(
        Date,
        nullable=False,
    )

    actual_harvest_date: Mapped[datetime | None] = mapped_column(
        Date,
        nullable =False,
    )

    status: Mapped[CropStatus] = mapped_column(
        String(20),
        nullable=False,
        default=CropStatus.PLANNED,
    )

    area_hectares: Mapped[float | None] = mapped_column(
        Float,
        nullable=False,
    )

    expected_yield: Mapped[float | None] =mapped_column(
        Float,
        nullable=False,
    )

    notes: Mapped[str |None] =mapped_column(
        Text,
        nullable=True,
    )

    field: Mapped["Field"] = relationship(
        "Field",
        back_populates="crops",
    )
