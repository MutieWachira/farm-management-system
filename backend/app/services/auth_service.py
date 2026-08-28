from sqlalchemy.orm import Session

from app.core.security import (
    create_access_token,
    create_refresh_token,
    hash_password,
    verify_password,
)
from app.models.user import User
from app.repositories.user_repository import UserRepository
from app.schemas.auth import RegisterRequest


class AuthenticationError(Exception):
    """Raised when authentication fails."""


class UserAlreadyExistsError(Exception):
    """Raised when an email is already registered."""


class AuthService:
    """Business logic for authentication."""

    def __init__(self, session: Session) -> None:
        self.users = UserRepository(session)
        self.session = session

    def register(self, data: RegisterRequest) -> User:
        """Register a new user."""

        email = data.email.lower()

        existing_user = self.users.get_by_email(email)

        if existing_user is not None:
            raise UserAlreadyExistsError("A user with this email already exists.")

        user = User(
            email=email,
            password_hash=hash_password(data.password),
            first_name=data.first_name.strip(),
            last_name=data.last_name.strip(),
        )

        self.users.create(user)
        self.session.commit()

        return user

    def authenticate(
        self,
        email: str,
        password: str,
    ) -> tuple[str, str]:
        """Authenticate a user and create tokens."""

        user = self.users.get_by_email(email.lower())

        if user is None:
            raise AuthenticationError("Invalid credentials.")

        if not user.is_active:
            raise AuthenticationError("User account is inactive.")

        if not verify_password(
            password,
            user.password_hash,
        ):
            raise AuthenticationError("Invalid credentials.")

        subject = str(user.id)

        return (
            create_access_token(subject),
            create_refresh_token(subject),
        )
