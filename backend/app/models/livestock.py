
from enum import Enum
from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import (
    CheckConstraint,
    Date,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.farm import Farm


class LivestockStatus(str, Enum):
    """Lifecycle states for livestock records."""

    ACTIVE = "ACTIVE"
    SOLD = "SOLD"
    DECEASED = "DECEASED"
    MISSING = "MISSING"


class Livestock(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """Represents an individual animal or a managed animal group."""

    __tablename__ = "livestock"

    __table_args__ = (
        CheckConstraint(
            "quantity > 0",
            name="ck_livestock_quantity_positive",
        ),
        UniqueConstraint(
            "farm_id",
            "tag_number",
            name="uq_livestock_farm_tag_number",
        ),
        Index(
            "ix_livestock_farm_species",
            "farm_id",
            "species",
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

    species: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    breed: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )

    tag_number: Mapped[str | None] = mapped_column(
        String(80),
        nullable=True,
    )

    quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
    )

    sex: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )

    birth_date: Mapped[Date | None] = mapped_column(
        Date,
        nullable=True,
    )

    acquisition_date: Mapped[Date | None] = mapped_column(
        Date,
        nullable=True,
    )

    purpose: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    status: Mapped[LivestockStatus] = mapped_column(
        String(20),
        nullable=False,
        default=LivestockStatus.ACTIVE,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    farm: Mapped["Farm"] = relationship(
        back_populates="livestock",
    )
