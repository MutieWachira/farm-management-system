from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.api.field_dependencies import (
    get_farm_membership,
)
from app.core.permissions import require_manager_or_owner
from app.db.session import get_db
from app.models.crop import Crop
from app.models.farm_membership import FarmMembership
from app.models.field import Field
from app.models.user import User


def get_field_for_crop_access(
    field_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> Field:
    """
    Retrieve a field only when the current user belongs
    to the farm containing that field.
    """

    field = (
        session.query(Field)
        .filter(Field.id == field_id)
        .first()
    )

    if field is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found.",
        )

    membership = (
        session.query(FarmMembership)
        .filter(
            FarmMembership.farm_id == field.farm_id,
            FarmMembership.user_id == current_user.id,
        )
        .first()
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found.",
        )

    return field


def get_manageable_field_for_crop(
    field_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> Field:
    """
    Retrieve a field and require OWNER or MANAGER access.
    """

    field = (
        session.query(Field)
        .filter(Field.id == field_id)
        .first()
    )

    if field is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found.",
        )

    membership = (
        session.query(FarmMembership)
        .filter(
            FarmMembership.farm_id == field.farm_id,
            FarmMembership.user_id == current_user.id,
        )
        .first()
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found.",
        )

    require_manager_or_owner(membership.role)

    return field


def get_field_crop(
    field_id: UUID,
    crop_id: UUID,
    field: Field = Depends(
        get_field_for_crop_access,
    ),
    session: Session = Depends(get_db),
) -> Crop:
    """
    Retrieve a crop only when it belongs to the requested field.
    """

    crop = (
        session.query(Crop)
        .filter(
            Crop.id == crop_id,
            Crop.field_id == field.id,
        )
        .first()
    )

    if crop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crop not found.",
        )

    return crop