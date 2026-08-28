from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class UserRepository:
    """Database operations for users."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def get_by_id(self, user_id: UUID) -> User | None:
        """Find a user by ID."""
        return self.session.get(User, user_id)

    def get_by_email(self, email: str) -> User | None:
        """Find a user by email."""
        statement = select(User).where(User.email == email)

        return self.session.scalar(statement)

    def create(self, user: User) -> User:
        """Persist a new user."""
        self.session.add(user)
        self.session.flush()

        return user
