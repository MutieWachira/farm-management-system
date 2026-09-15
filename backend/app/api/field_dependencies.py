from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.core.permissions import require_manager_or_owner
from app.db.session import get_db
from app.models.farm_membership import FarmMembership
from app.models.field import Field
from app.models.user import User


def get_farm_membership(
    farm_id: UUID,
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
) -> FarmMembership:
    """
    Return the current user's membership for a farm.

    A 404 is returned when the user is not a member.
    This prevents unnecessary exposure of private farm resources.
    """

    membership = (
        session.query(FarmMembership)
        .filter(
            FarmMembership.farm_id == farm_id,
            FarmMembership.user_id == current_user.id,
        )
        .first()
    )

    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found.",
        )

    return membership


def get_manageable_farm_membership(
    membership: FarmMembership = Depends(
        get_farm_membership,
    ),
) -> FarmMembership:
    """
    Require OWNER or MANAGER permissions.

    This dependency is used for operations that modify
    farm resources, such as creating, updating, or deleting fields.
    """

    require_manager_or_owner(membership.role)

    return membership


def get_farm_field(
    farm_id: UUID,
    field_id: UUID,
    membership: FarmMembership = Depends(
        get_farm_membership,
    ),
    session: Session = Depends(get_db),
) -> Field:
    """
    Retrieve a field belonging to the requested farm.

    The user must first be a member of the farm.

    The farm_id and field_id are both checked so that a field
    belonging to another farm cannot be accessed through a
    different farm URL.

    Any farm member may retrieve a field.
    """

    field = (
        session.query(Field)
        .filter(
            Field.id == field_id,
            Field.farm_id == farm_id,
        )
        .first()
    )

    if field is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found.",
        )

    return field