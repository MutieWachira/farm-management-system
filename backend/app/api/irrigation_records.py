"""API endpoints for irrigation record management."""

from uuid import UUID

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.orm import Session

from app.api.field_dependencies import (
    get_farm_membership,
    get_manageable_farm_membership,
)
from app.db.session import get_db
from app.models.farm_membership import FarmMembership
from app.models.irrigation_record import IrrigationRecord
from app.repositories.irrigation_record_repository import (
    IrrigationRecordRepository,
)
from app.schemas.irrigation_record import (
    IrrigationRecordCreate,
    IrrigationRecordResponse,
    IrrigationRecordUpdate,
)
from app.services.irrigation_record_service import (
    IrrigationRecordService,
)


router = APIRouter(
    prefix="/api/v1/farms/{farm_id}/irrigation-records",
    tags=["Irrigation Records"],
)


def get_irrigation_record(
    farm_id: UUID,
    record_id: UUID,
    membership: FarmMembership = Depends(get_farm_membership),
    session: Session = Depends(get_db),
) -> IrrigationRecord:
    """Find a record within the requested farm only."""

    repository = IrrigationRecordRepository(session)
    record = repository.get_by_id_and_farm(
        record_id=record_id,
        farm_id=farm_id,
    )

    if record is None:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Irrigation record not found.",
        )

    return record


@router.post(
    "",
    response_model=IrrigationRecordResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_irrigation_record(
    farm_id: UUID,
    data: IrrigationRecordCreate,
    membership: FarmMembership = Depends(
        get_manageable_farm_membership
    ),
    session: Session = Depends(get_db),
):
    """Record an irrigation session for a field."""

    service = IrrigationRecordService(session)
    return service.create(farm_id=farm_id, data=data)


@router.get(
    "",
    response_model=list[IrrigationRecordResponse],
)
def list_irrigation_records(
    farm_id: UUID,
    membership: FarmMembership = Depends(get_farm_membership),
    session: Session = Depends(get_db),
):
    """List irrigation records belonging to a farm."""

    repository = IrrigationRecordRepository(session)
    return repository.list_by_farm(farm_id=farm_id)


@router.get(
    "/{record_id}",
    response_model=IrrigationRecordResponse,
)
def read_irrigation_record(
    record: IrrigationRecord = Depends(get_irrigation_record),
):
    """Retrieve one irrigation record."""

    return record


@router.patch(
    "/{record_id}",
    response_model=IrrigationRecordResponse,
)
def update_irrigation_record(
    data: IrrigationRecordUpdate,
    record: IrrigationRecord = Depends(get_irrigation_record),
    membership: FarmMembership = Depends(
        get_manageable_farm_membership
    ),
    session: Session = Depends(get_db),
):
    """Update an existing irrigation record."""

    service = IrrigationRecordService(session)
    return service.update(record=record, data=data)


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_irrigation_record(
    record: IrrigationRecord = Depends(get_irrigation_record),
    membership: FarmMembership = Depends(
        get_manageable_farm_membership
    ),
    session: Session = Depends(get_db),
):
    """Delete an irrigation record."""

    service = IrrigationRecordService(session)
    service.delete(record)

    return Response(status_code=status.HTTP_204_NO_CONTENT)
