
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, Float, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.farm import Farm
    from app.models.crop import Crop


class FieldStatus(str, Enum):
    """Possible operational states for a field."""

    ACTIVE = "ACTIVE"
    FALLOW = "FALLOW"
    INACTIVE = "INACTIVE"


class Field(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    """Database model representing an agricultural field."""

    __tablename__ = "fields"

    __table_args__ = (
        CheckConstraint(
            "area_hectares > 0",
            name="ck_fields_area_positive",
        ),
    )

    farm_id: Mapped[UUID] = mapped_column(
        ForeignKey(
            "farms.id",
            ondelete="CASCADE",
        ),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    area_hectares: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    soil_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    status: Mapped[FieldStatus] = mapped_column(
        String(20),
        nullable=False,
        default=FieldStatus.ACTIVE,
    )

    irrigation_type: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    farm: Mapped["Farm"] = relationship(
        "Farm",
        back_populates="fields",
    )

    crops: Mapped[list["Crop"]] = relationship(
        back_populates="field",
        cascade="all, delete-orphan",
    )

