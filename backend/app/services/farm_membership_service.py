from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.core.enums import FarmRole
from app.models.farm_membership import FarmMembership
from app.models.user import User
from app.repositories.farm_membership_repository import (
    FarmMembershipRepository,
)


class FarmMembershipService:
    """Business logic for farm membership management."""

    def __init__(
        self,
        session: Session,
    ) -> None:
        self.session = session

        self.memberships = (
            FarmMembershipRepository(session)
        )

    def add_member(
        self,
        farm_id: UUID,
        email: str,
        role: FarmRole,
    ) -> FarmMembership:
        """Add an existing user to a farm."""

        user = self._find_user(email)

        existing = self.memberships.get(
            farm_id,
            user.id,
        )

        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User is already a member of this farm.",
            )

        membership = FarmMembership(
            farm_id=farm_id,
            user_id=user.id,
            role=role,
        )

        self.memberships.create(membership)
        self.session.commit()

        return membership

    def update_role(
        self,
        membership: FarmMembership,
        role: FarmRole,
    ) -> FarmMembership:
        """Change a member's role."""

        if membership.role == FarmRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The farm owner cannot be changed here.",
            )

        membership.role = role

        self.session.commit()

        return membership

    def remove_member(
        self,
        membership: FarmMembership,
    ) -> None:
        """Remove a user from a farm."""

        if membership.role == FarmRole.OWNER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The farm owner cannot be removed.",
            )

        self.memberships.delete(membership)
        self.session.commit()

    def _find_user(
        self,
        email: str,
    ) -> User:
        user = self.session.query(User).filter(
            User.email == email.lower().strip(),
        ).first()

        if user is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found.",
            )

        return user
