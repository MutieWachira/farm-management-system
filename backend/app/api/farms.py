from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.api.farm_dependencies import get_owned_farm
from app.db.session import get_db
from app.models.farm import Farm
from app.models.user import User
from app.repositories.farm_repository import FarmRepository
from app.schemas.farm import (
    FarmCreate,
    FarmResponse,
    FarmUpdate,
)
from app.services.farm_services import FarmService


router = APIRouter(
    prefix="/api/v1/farms",
    tags=["Farms"],
)


@router.post(
    "",
    response_model=FarmResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_farm(
    data: FarmCreate,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> Farm:
    """Create a farm for the authenticated user."""

    return FarmService(session).create(
        owner_id=current_user.id,
        data=data,
    )


@router.get(
    "",
    response_model=list[FarmResponse],
)
def list_farms(
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> list[Farm]:
    """Return farms owned by the authenticated user."""

    return FarmRepository(session).list_by_owner(
        current_user.id,
    )


@router.get(
    "/{farm_id}",
    response_model=FarmResponse,
)
def get_farm(
    farm: Farm = Depends(get_owned_farm),
) -> Farm:
    """Return an owned farm by ID."""

    return farm


@router.patch(
    "/{farm_id}",
    response_model=FarmResponse,
)
def update_farm(
    data: FarmUpdate,
    farm: Farm = Depends(get_owned_farm),
    session: Session = Depends(get_db),
) -> Farm:
    """Update an owned farm."""

    return FarmService(session).update(
        farm=farm,
        data=data,
    )


@router.delete(
    "/{farm_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_farm(
    farm: Farm = Depends(get_owned_farm),
    session: Session = Depends(get_db),
) -> None:
    """Delete an owned farm."""

    FarmService(session).delete(farm)