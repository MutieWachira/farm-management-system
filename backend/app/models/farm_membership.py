from typing import TYPE_CHECKING
from uuid import UUID

from sqlalchemy import Enum, ForeignKey, Index, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.enums import FarmRole
from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.farm import Farm
    from app.models.user import User


class FarmMembership(
    UUIDPrimaryKeyMixin,
    TimestampMixin,
    Base,
):
    __tablename__ = "farm_memberships"

    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "farm_id",
            name="uq_farm_membership_user_farm",
        ),
        Index(
            "ix_farm_memberships_farm_user",
            "farm_id",
            "user_id",
        ),
    )

    user_id: Mapped[UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    farm_id: Mapped[UUID] = mapped_column(
        ForeignKey("farms.id", ondelete="CASCADE"),
        nullable=False,
    )

    role: Mapped[FarmRole] = mapped_column(
        Enum(
            FarmRole,
            name="farm_role",
            native_enum=True,
        ),
        nullable=False,
        default=FarmRole.WORKER,
    )

    user: Mapped["User"] = relationship(
        back_populates="memberships",
    )

    farm: Mapped["Farm"] = relationship(
        back_populates="memberships",
    )
