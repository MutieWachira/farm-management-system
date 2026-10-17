
"""API endpoints for interactive farm visualization layouts."""

from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.field_dependencies import (
    get_farm_membership,
    get_manageable_farm_membership,
)
from app.db.session import get_db
from app.models.farm_layout import FarmLayout
from app.models.farm_membership import FarmMembership
from app.schemas.farm_layout import (
    FarmLayoutData,
    FarmLayoutResponse,
    FarmLayoutSave,
)
from app.services.farm_layout_services import FarmLayoutService


router = APIRouter(
    prefix="/api/v1/farms/{farm_id}/layout",
    tags=["Farm Visualization"],
)


@router.get(
    "",
    response_model=FarmLayoutResponse | None,
)
def get_farm_layout(
    farm_id: UUID,
    membership: FarmMembership = Depends(get_farm_membership),
    session: Session = Depends(get_db),
) -> FarmLayout | None:
    """Retrieve a farm's saved layout.

    Any member of the farm can view its layout.
    Returns null if no layout has been saved yet.
    """

    service = FarmLayoutService(session)

    return service.get_by_farm_id(farm_id)


@router.put(
    "",
    response_model=FarmLayoutResponse,
    status_code=status.HTTP_200_OK,
)
def save_farm_layout(
    farm_id: UUID,
    payload: FarmLayoutSave,
    membership: FarmMembership = Depends(
        get_manageable_farm_membership,
    ),
    session: Session = Depends(get_db),
) -> FarmLayout:
    """Create or update a farm's visual layout.

    Only OWNER and MANAGER members can save changes.
    Every referenced field is checked by the service.
    """

    service = FarmLayoutService(session)

    return service.save(
        farm_id=farm_id,
        data=payload.layout_data,
    )
