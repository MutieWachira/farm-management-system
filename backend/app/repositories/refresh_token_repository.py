from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session
import secrets

from app.models.refresh_token import RefreshToken


class RefreshTokenRepository:
    """Database operations for refresh tokens."""

    def __init__(self, session: Session) -> None:
        self.session = session

    def create(self, token: RefreshToken) -> RefreshToken:
        self.session.add(token)
        self.session.flush()
        return token

    def get_active(
        self,
        token_hash: str,
    ) -> RefreshToken | None:
        statement = select(RefreshToken).where(
            RefreshToken.token_hash == token_hash,
            RefreshToken.revoked_at.is_(None),
            RefreshToken.expires_at > datetime.now(timezone.utc),
        )

        return self.session.scalar(statement)

    def revoke(self, token: RefreshToken) -> None:
        token.revoked_at = datetime.now(timezone.utc)
        self.session.flush()

    def create_refresh_token_value() -> str:
        """Generate a cryptographically secure refresh token."""
        return secrets.token_urlsafe(64)