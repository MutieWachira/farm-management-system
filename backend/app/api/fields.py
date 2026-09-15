from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.api.field_dependencies import (
    get_farm_field,
    get_farm_membership,
    get_manageable_farm_membership,
)
from app.db.session import get_db
from app.models.farm_membership import FarmMembership
from app.models.field import Field
from app.schemas.field import (
    FieldCreate,
    FieldResponse,
    FieldUpdate,
)
from app.services.field_services import FieldService
from app.repositories.field_repository import FieldRepository


router = APIRouter(
    prefix="/api/v1/farms/{farm_id}/fields",
    tags=["Fields"],
)


@router.post(
    "",
    response_model=FieldResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_field(
    farm_id: UUID,
    data: FieldCreate,
    membership: FarmMembership = Depends(
        get_manageable_farm_membership,
    ),
    session: Session = Depends(get_db),
) -> Field:
    """
    Create a new field inside a farm.

    Only OWNER and MANAGER users can create fields.
    """

    service = FieldService(session)

    return service.create(
        farm_id=farm_id,
        data=data,
    )


@router.get(
    "",
    response_model=list[FieldResponse],
)
def list_fields(
    farm_id: UUID,
    membership: FarmMembership = Depends(
        get_farm_membership,
    ),
    session: Session = Depends(get_db),
) -> list[Field]:
    """
    List all fields belonging to a farm.

    Any farm member can view fields.
    """

    repository = FieldRepository(session)

    return repository.list_by_farm(farm_id)


@router.get(
    "/{field_id}",
    response_model=FieldResponse,
)
def get_field(
    farm_id: UUID,
    field_id: UUID,
    field: Field = Depends(get_farm_field),
) -> Field:
    """
    Retrieve a single field.

    Any farm member can view the field.
    """

    return field


@router.patch(
    "/{field_id}",
    response_model=FieldResponse,
)
def update_field(
    farm_id: UUID,
    field_id: UUID,
    data: FieldUpdate,
    field: Field = Depends(get_farm_field),
    membership: FarmMembership = Depends(
        get_manageable_farm_membership,
    ),
    session: Session = Depends(get_db),
) -> Field:
    """
    Update an existing field.

    Only OWNER and MANAGER users can update fields.
    """

    service = FieldService(session)

    return service.update(
        field=field,
        data=data,
    )


@router.delete(
    "/{field_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_field(
    farm_id: UUID,
    field_id: UUID,
    field: Field = Depends(get_farm_field),
    membership: FarmMembership = Depends(
        get_manageable_farm_membership,
    ),
    session: Session = Depends(get_db),
) -> None:
    """
    Delete a field.

    Only OWNER and MANAGER users can delete fields.
    """

    service = FieldService(session)

    service.delete(field)