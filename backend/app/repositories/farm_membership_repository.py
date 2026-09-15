from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.farm_membership import FarmMembership


class FarmMembershipRepository:
    """Database operations for farm memberships."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(
        self,
        membership: FarmMembership,
    ) -> FarmMembership:
        self.session.add(membership)
        self.session.flush()

        return membership

    def get(
        self,
        farm_id: UUID,
        user_id: UUID,
    ) -> FarmMembership | None:
        statement = select(FarmMembership).where(
            FarmMembership.farm_id == farm_id,
            FarmMembership.user_id == user_id,
        )

        return self.session.scalar(statement)

    def list_by_farm(
        self,
        farm_id: UUID,
    ) -> list[FarmMembership]:
        statement = (
            select(FarmMembership)
            .where(
                FarmMembership.farm_id == farm_id,
            )
            .order_by(
                FarmMembership.joined_at.asc(),
            )
        )

        return list(
            self.session.scalars(statement).all()
        )

    def delete(
        self,
        membership: FarmMembership,
    ) -> None:
        self.session.delete(membership)
        self.session.flush()