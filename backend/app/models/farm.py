from typing import TYPE_CHECKING

from sqlalchemy import CheckConstraint, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, UUIDPrimaryKeyMixin, TimestampMixin

if TYPE_CHECKING:
    from app.models.farm_membership import FarmMembership
    from app.models.field import Field


class Farm(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "farms"

    __table_args__ = (
        CheckConstraint(
            "area IS NULL OR area > 0",
            name="ck_farms_area_positive",
        ),
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    location: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    area: Mapped[float | None] = mapped_column(
        Numeric(12, 2),
        nullable=True,
    )

    memberships: Mapped[list["FarmMembership"]] = relationship(
        "FarmMembership",
        back_populates="farm",
        cascade="all, delete-orphan",
    )

    fields: Mapped[list["Field"]] = relationship(
        "Field",
        back_populates="farm",
        cascade="all, delete-orphan",
    )