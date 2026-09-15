from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import CheckConstraint, Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.farm_membership import FarmMembership
    from app.models.field import Field
    from app.models.user import User


class Farm(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "farms"

    __table_args__ = (
        CheckConstraint(
            "area_hectares IS NULL OR area_hectares > 0",
            name="ck_farms_area_positive",
        ),
    )

    owner_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    location: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    area_hectares: Mapped[float | None] = mapped_column(
        Float,
        nullable=True,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    owner: Mapped["User"] = relationship(
        back_populates="farms",
    )

    # Users who belong to this farm
    memberships: Mapped[list["FarmMembership"]] = relationship(
        "FarmMembership",
        back_populates="farm",
        cascade="all, delete-orphan",
    )

    # Fields belonging to this farm
    fields: Mapped[list["Field"]] = relationship(
        "Field",
        back_populates="farm",
        cascade="all, delete-orphan",
    )