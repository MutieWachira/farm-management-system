"""Database model for recorded irrigation sessions."""

from datetime import date
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Date,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.farm import Farm
    from app.models.field import Field


class IrrigationRecord(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    """A record of water applied to an agricultural field."""

    __tablename__ = "irrigation_records"

    __table_args__ = (
        CheckConstraint(
            "duration_minutes > 0",
            name="ck_irrigation_records_duration_positive",
        ),
        CheckConstraint(
            "water_volume_liters > 0",
            name="ck_irrigation_records_water_volume_positive",
        ),
        Index(
            "ix_irrigation_records_farm_date",
            "farm_id",
            "irrigation_date",
        ),
    )

    farm_id: Mapped[UUID] = mapped_column(
        ForeignKey("farms.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    field_id: Mapped[UUID] = mapped_column(
        ForeignKey("fields.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    irrigation_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )

    method: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    duration_minutes: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    water_volume_liters: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    farm: Mapped["Farm"] = relationship("Farm")

    field: Mapped["Field"] = relationship("Field")
