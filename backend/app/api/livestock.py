
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.api.farm_activity_dependencies import (
    get_farm_membership,
    get_manageable_farm_membership,
)
from app.db.session import get_db
from app.models.farm_membership import FarmMembership
from app.models.livestock import LivestockStatus
from app.schemas.livestock import (
    LivestockCreate,
    LivestockResponse,
    LivestockUpdate,
)
from app.services.livestock_service import LivestockService


router = APIRouter(
    prefix="/api/v1/farms/{farm_id}/livestock",
    tags=["Livestock"],
)


@router.post(
    "",
    response_model=LivestockResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_livestock(
    farm_id: UUID,
    data: LivestockCreate,
    membership: FarmMembership = Depends(
        get_manageable_farm_membership
    ),
    session: Session = Depends(get_db),
):
    service = LivestockService(session)

    return service.create(
        farm_id=farm_id,
        data=data,
    )


@router.get(
    "",
    response_model=list[LivestockResponse],
)
def list_livestock(
    farm_id: UUID,
    search: str | None = Query(default=None, max_length=150),
    species: str | None = Query(default=None, max_length=50),
    livestock_status: LivestockStatus | None = Query(
        default=None,
        alias="status",
    ),
    purpose: str | None = Query(default=None, max_length=50),
    acquisition_date_from: date | None = Query(default=None),
    acquisition_date_to: date | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    membership: FarmMembership = Depends(get_farm_membership),
    session: Session = Depends(get_db),
):
    service = LivestockService(session)

    records, _total = service.list_by_farm(
        farm_id=farm_id,
        search=search,
        species=species,
        status_filter=livestock_status,
        purpose=purpose,
        acquisition_date_from=acquisition_date_from,
        acquisition_date_to=acquisition_date_to,
        limit=limit,
        offset=offset,
    )

    return records


@router.get(
    "/{livestock_id}",
    response_model=LivestockResponse,
)
def get_livestock(
    farm_id: UUID,
    livestock_id: UUID,
    membership: FarmMembership = Depends(get_farm_membership),
    session: Session = Depends(get_db),
):
    service = LivestockService(session)

    return service.get_by_id_and_farm(
        livestock_id=livestock_id,
        farm_id=farm_id,
    )


@router.patch(
    "/{livestock_id}",
    response_model=LivestockResponse,
)
def update_livestock(
    farm_id: UUID,
    livestock_id: UUID,
    data: LivestockUpdate,
    membership: FarmMembership = Depends(
        get_manageable_farm_membership
    ),
    session: Session = Depends(get_db),
):
    service = LivestockService(session)

    return service.update(
        livestock_id=livestock_id,
        farm_id=farm_id,
        data=data,
    )
