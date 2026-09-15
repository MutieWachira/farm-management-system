from uuid import UUID
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.farm import Farm
from app.models.user import User
from app.repositories.farm_repository import FarmRepository

def get_owned_farm(
    farm_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> Farm:
    """return a farm only if it belongs to the current user"""
    farm = FarmRepository(session).get_by_id(farm_id,)
    if farm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found",
        )

    if farm.owner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found",
        )

    return farm
