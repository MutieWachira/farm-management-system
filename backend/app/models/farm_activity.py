from datetime import date
from enum import Enum
from uuid import UUID
from typing import TYPE_CHECKING

from sqlalchemy import Date, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.farm import Farm
    from app.models.field import Field
    from app.models.crop import Crop

class ActivityType(str, Enum):
    PLANTING = "PLANTING"
    IRRIGATION = "IRRIGATION"
    FERTILIZATION = "FERTILIZATION"
    SPRAYING = "SPRAYING"
    WEEDING = "WEEDING"
    PEST_CONTROL = "PEST_CONTROL"
    HARVESTING = "HARVESTING"
    LAND_PREPARATION = "LAND_PREPARATION"
    MAINTENANCE = "MAINTENANCE"
    OTHER = "OTHER"


class FarmActivity(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "farm_activities"

    farm_id: Mapped[UUID] = mapped_column(
        ForeignKey("farms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    field_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("fields.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    crop_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("crops.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    activity_type: Mapped[ActivityType] = mapped_column(
        String(30),
        nullable=False,
        index=True,
    )

    activity_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    quantity: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    unit: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    cost: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    farm: Mapped["Farm"] = relationship(
        back_populates="activities",
    )

    field: Mapped["Field | None"] = relationship(
        back_populates="activities",
    )

    crop: Mapped["Crop | None"] = relationship(
        back_populates="activities",
    )