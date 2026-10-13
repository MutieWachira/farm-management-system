from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.farm_activity_dependencies import (
    get_farm_activity,
    get_farm_membership,
    get_manageable_farm_membership,
    validate_activity_scope,
)
from app.db.session import get_db
from app.models.farm_activity import FarmActivity
from app.models.farm_membership import FarmMembership
from app.repositories.farm_activity_repository import (
    FarmActivityRepository,
)
from app.schemas.farm_activity import (
    FarmActivityCreate,
    FarmActivityResponse,
    FarmActivityUpdate,
)
from app.services.farm_activity_service import (
    FarmActivityService,
)


router = APIRouter(
    prefix="/api/v1/farms/{farm_id}/activities",
    tags=["Farm Activities"],
)


@router.post(
    "",
    response_model=FarmActivityResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_activity(
    farm_id: UUID,
    data: FarmActivityCreate,
    membership: FarmMembership = Depends(
        get_manageable_farm_membership
    ),
    session: Session = Depends(get_db),
):
    validate_activity_scope(
        farm_id=farm_id,
        field_id=data.field_id,
        crop_id=data.crop_id,
        session=session,
    )

    service = FarmActivityService(session)

    return service.create(
        farm_id=farm_id,
        data=data,
    )


@router.get(
    "",
    response_model=list[FarmActivityResponse],
)
def list_activities(
    farm_id: UUID,
    membership: FarmMembership = Depends(
        get_farm_membership
    ),
    session: Session = Depends(get_db),
):
    repository = FarmActivityRepository(session)

    return repository.list_by_farm(farm_id)


@router.get(
    "/{activity_id}",
    response_model=FarmActivityResponse,
)
def get_activity(
    activity: FarmActivity = Depends(
        get_farm_activity
    ),
):
    return activity


@router.patch(
    "/{activity_id}",
    response_model=FarmActivityResponse,
)
def update_activity(
    farm_id: UUID,
    activity_id: UUID,
    data: FarmActivityUpdate,
    activity: FarmActivity = Depends(
        get_farm_activity
    ),
    membership: FarmMembership = Depends(
        get_manageable_farm_membership
    ),
    session: Session = Depends(get_db),
):
    validate_activity_scope(
        farm_id=farm_id,
        field_id=data.field_id,
        crop_id=data.crop_id,
        session=session,
    )

    service = FarmActivityService(session)

    return service.update(
        activity=activity,
        data=data,
    )


@router.delete(
    "/{activity_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_activity(
    farm_id: UUID,
    activity_id: UUID,
    activity: FarmActivity = Depends(
        get_farm_activity
    ),
    membership: FarmMembership = Depends(
        get_manageable_farm_membership
    ),
    session: Session = Depends(get_db),
):
    service = FarmActivityService(session)

    service.delete(activity)

    return Response(
        status_code=status.HTTP_204_NO_CONTENT
    )
