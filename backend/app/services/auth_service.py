from sqlalchemy.orm import Session

from datetime import datetime, timedelta, timezone

from app.core.config import get_settings
from app.core.security import (
    create_access_token,
    create_refresh_token_value,
    hash_password,
    hash_token,
    verify_password,
)
from app.models.refresh_token import RefreshToken
from app.repositories.refresh_token_repository import (
    RefreshTokenRepository,
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
        self.refresh_tokens = RefreshTokenRepository(session)

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
        """Authenticate a user and create an access/refresh token pair."""

        user = self.users.get_by_email(email.lower())

        if user is None:
            raise AuthenticationError("Invalid credentials.")

        if not user.is_active:
            raise AuthenticationError("Invalid credentials.")

        if not verify_password(
            password,
            user.password_hash,
        ):
            raise AuthenticationError("Invalid credentials.")

        settings = get_settings()

        access_token = create_access_token(str(user.id))

        refresh_token = create_refresh_token_value()

        refresh_record = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(refresh_token),
            expires_at=(
                datetime.now(timezone.utc)
                + timedelta(
                    days=settings.refresh_token_expire_days,
                )
            ),
        )

        self.refresh_tokens.create(refresh_record)

        self.session.commit()

        return access_token, refresh_token

    def refresh(
    self,
    refresh_token: str,
) -> tuple[str, str]:
        """Rotate a refresh token and issue a new token pair."""

        token_hash = hash_token(refresh_token)

        stored_token = self.refresh_tokens.get_active(
            token_hash,
        )

        if stored_token is None:
            raise AuthenticationError(
                "Invalid or expired refresh token."
            )

        user = self.users.get_by_id(
            stored_token.user_id,
        )

        if user is None or not user.is_active:
            raise AuthenticationError(
                "Invalid or expired refresh token."
            )

        self.refresh_tokens.revoke(stored_token)

        settings = get_settings()

        new_access_token = create_access_token(
            str(user.id),
        )

        new_refresh_token = create_refresh_token_value()

        new_record = RefreshToken(
            user_id=user.id,
            token_hash=hash_token(new_refresh_token),
            expires_at=(
                datetime.now(timezone.utc)
                + timedelta(
                    days=settings.refresh_token_expire_days,
                )
            ),
        )

        self.refresh_tokens.create(new_record)

        self.session.commit()

        return new_access_token, new_refresh_token

    def logout(self, refresh_token: str) -> None:
        """Revoke a refresh token."""

        token_hash = hash_token(refresh_token)

        stored_token = self.refresh_tokens.get_active(
            token_hash,
        )

        if stored_token is not None:
            self.refresh_tokens.revoke(stored_token)
            self.session.commit()