"""Farm membership endpoints."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.dependencies import get_current_user
from app.core.enums import FarmRole
from app.db.session import get_db
from app.models.farm import Farm
from app.models.farm_membership import FarmMembership
from app.models.user import User
from app.schemas.farm_membership import AddFarmMemberRequest, FarmMemberResponse, UpdateFarmMemberRequest
from app.services.farm_membership_service import FarmMembershipService


router = APIRouter(prefix="/api/v1/farms/{farm_id}/members", tags=["Farm Memberships"])


def _get_farm(farm_id: UUID, session: Session) -> Farm:
    farm = session.get(Farm, farm_id)
    if farm is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm not found")
    return farm


def _get_membership(farm_id: UUID, user_id: UUID, session: Session) -> FarmMembership | None:
    return session.scalar(select(FarmMembership).where(FarmMembership.farm_id == farm_id, FarmMembership.user_id == user_id))


def _require_access(farm_id: UUID, user: User, session: Session) -> FarmMembership:
    membership = _get_membership(farm_id, user.id, session)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have access to this farm")
    return membership


def _require_manager(farm_id: UUID, user: User, session: Session) -> FarmMembership:
    membership = _require_access(farm_id, user, session)
    if membership.role not in {FarmRole.OWNER, FarmRole.MANAGER, FarmRole.ADMIN}:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to manage farm members")
    return membership


def _response(membership: FarmMembership) -> FarmMemberResponse:
    return FarmMemberResponse(
        id=membership.id,
        farm_id=membership.farm_id,
        user_id=membership.user_id,
        role=membership.role,
        joined_at=membership.joined_at,
        email=membership.user.email,
    )


@router.get("", response_model=list[FarmMemberResponse])
def list_farm_members(farm_id: UUID, session: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> list[FarmMemberResponse]:
    _get_farm(farm_id, session)
    _require_access(farm_id, current_user, session)
    memberships = session.scalars(
        select(FarmMembership).where(FarmMembership.farm_id == farm_id)
        .options(selectinload(FarmMembership.user)).order_by(FarmMembership.joined_at)
    ).all()
    return [_response(membership) for membership in memberships]


@router.post("", response_model=FarmMemberResponse, status_code=status.HTTP_201_CREATED)
def add_farm_member(farm_id: UUID, data: AddFarmMemberRequest, session: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> FarmMemberResponse:
    _get_farm(farm_id, session)
    _require_manager(farm_id, current_user, session)
    if data.role is FarmRole.OWNER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="A new member cannot be assigned the owner role")
    membership = FarmMembershipService(session).add_member(farm_id, data.email, data.role)
    session.refresh(membership, attribute_names=["user"])
    return _response(membership)


@router.patch("/{user_id}", response_model=FarmMemberResponse)
def update_farm_member(farm_id: UUID, user_id: UUID, data: UpdateFarmMemberRequest, session: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> FarmMemberResponse:
    _get_farm(farm_id, session)
    _require_manager(farm_id, current_user, session)
    membership = _get_membership(farm_id, user_id, session)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm member not found")
    if data.role is FarmRole.OWNER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="The owner role cannot be assigned here")
    membership = FarmMembershipService(session).update_role(membership, data.role)
    session.refresh(membership, attribute_names=["user"])
    return _response(membership)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_farm_member(farm_id: UUID, user_id: UUID, session: Session = Depends(get_db), current_user: User = Depends(get_current_user)) -> None:
    _get_farm(farm_id, session)
    _require_manager(farm_id, current_user, session)
    membership = _get_membership(farm_id, user_id, session)
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Farm member not found")
    FarmMembershipService(session).remove_member(membership)
