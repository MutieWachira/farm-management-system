from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.crop_dependencies import (
    get_field_crop,
    get_field_for_crop_access,
    get_manageable_field_for_crop,
)
from app.db.session import get_db
from app.models.crop import Crop
from app.models.field import Field
from app.repositories.crop_repository import CropRepository
from app.schemas.crop import (
    CropCreate,
    CropResponse,
    CropUpdate,
)
from app.services.crop_services import CropService


router = APIRouter(
    prefix="/api/v1/fields/{field_id}/crops",
    tags=["Crops"],
)


@router.post(
    "",
    response_model=CropResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_crop(
    field_id: UUID,
    data: CropCreate,
    field: Field = Depends(
        get_manageable_field_for_crop,
    ),
    session: Session = Depends(get_db),
) -> Crop:
    """
    Create a crop on a field.

    Only OWNER and MANAGER users can create crops.
    """

    service = CropService(session)

    return service.create(
        field_id=field.id,
        data=data,
    )


@router.get(
    "",
    response_model=list[CropResponse],
)
def list_crops(
    field_id: UUID,
    field: Field = Depends(
        get_field_for_crop_access,
    ),
    session: Session = Depends(get_db),
) -> list[Crop]:
    """
    List all crops belonging to a field.

    Any member of the farm can view crops.
    """

    repository = CropRepository(session)

    return repository.list_by_field(field.id)


@router.get(
    "/{crop_id}",
    response_model=CropResponse,
)
def get_crop(
    field_id: UUID,
    crop_id: UUID,
    crop: Crop = Depends(get_field_crop),
) -> Crop:
    """
    Retrieve one crop.
    """

    return crop


@router.patch(
    "/{crop_id}",
    response_model=CropResponse,
)
def update_crop(
    field_id: UUID,
    crop_id: UUID,
    data: CropUpdate,
    crop: Crop = Depends(get_field_crop),
    field: Field = Depends(
        get_manageable_field_for_crop,
    ),
    session: Session = Depends(get_db),
) -> Crop:
    """
    Update a crop.

    Only OWNER and MANAGER users can update crops.
    """

    service = CropService(session)

    return service.update(
        crop=crop,
        data=data,
    )


@router.delete(
    "/{crop_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_crop(
    field_id: UUID,
    crop_id: UUID,
    crop: Crop = Depends(get_field_crop),
    field: Field = Depends(
        get_manageable_field_for_crop,
    ),
    session: Session = Depends(get_db),
) -> None:
    """
    Delete a crop.

    Only OWNER and MANAGER users can delete crops.
    """

    service = CropService(session)

    service.delete(crop)