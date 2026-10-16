from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.crop import Crop
from app.models.farm import Farm
from app.models.farm_activity import FarmActivity
from app.models.farm_membership import FarmMembership
from app.models.field import Field
from app.models.user import User



def get_farm_membership(
    farm_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> FarmMembership:
    farm = session.scalar(
        select(Farm).where(Farm.id == farm_id)
    )

    if farm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found.",
        )

    membership = session.scalar(
        select(FarmMembership).where(
            FarmMembership.farm_id == farm_id,
            FarmMembership.user_id == current_user.id,
        )
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found.",
        )

    return membership

def require_manager_or_owner(role) -> None:
    """
    Allow only farm owners and managers to perform
    management operations.
    """
    from app.models.farm_membership import FarmMembership

    allowed_roles = {
        "OWNER",
        "MANAGER",
        "owner",
        "manager",
    }

    role_value = getattr(role, "value", role)

    if str(role_value) not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to manage this farm.",
        )

def get_manageable_farm_membership(
    membership: FarmMembership = Depends(
        get_farm_membership
    ),
) -> FarmMembership:
    require_manager_or_owner(membership.role)

    return membership


def validate_activity_scope(
    farm_id: UUID,
    field_id: UUID | None,
    crop_id: UUID | None,
    session: Session,
) -> None:
    """
    Validate that the optional field and crop actually
    belong to the requested farm hierarchy.

    Farm
      └── Field
            └── Crop
    """

    field = None

    if field_id is not None:
        field = session.scalar(
            select(Field).where(
                Field.id == field_id,
                Field.farm_id == farm_id,
            )
        )

        if field is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Field does not belong to this farm.",
            )

    if crop_id is not None:
        crop = session.scalar(
            select(Crop).where(
                Crop.id == crop_id
            )
        )

        if crop is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Crop not found.",
            )

        if field is not None:
            if crop.field_id != field.id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Crop does not belong to the selected field.",
                )

        crop_field = session.scalar(
            select(Field).where(
                Field.id == crop.field_id,
                Field.farm_id == farm_id,
            )
        )

        if crop_field is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Crop does not belong to this farm.",
            )


def get_farm_activity(
    farm_id: UUID,
    activity_id: UUID,
    membership: FarmMembership = Depends(
        get_farm_membership
    ),
    session: Session = Depends(get_db),
) -> FarmActivity:
    activity = session.scalar(
        select(FarmActivity).where(
            FarmActivity.id == activity_id,
            FarmActivity.farm_id == farm_id,
        )
    )

    if activity is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm activity not found.",
        )

    return activity