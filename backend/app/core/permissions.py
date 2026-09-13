from fastapi import HTTPException, status

from app.core.enums import FarmRole


def require_manager_or_owner(
    role: FarmRole,
) -> None:
    """Require manager or owner permissions."""

    if role not in {
        FarmRole.OWNER,
        FarmRole.MANAGER,
    }:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions.",
        )


def require_owner(
    role: FarmRole,
) -> None:
    """Require owner permissions."""

    if role != FarmRole.OWNER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner permissions required.",
        )
