
from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.farm_activity_dependencies import (
    get_farm_membership,
    get_manageable_farm_membership,
)
from app.db.session import get_db
from app.models.farm_membership import FarmMembership
from app.models.inventory_transaction import InventoryMovementType
from app.schemas.inventory_item import (
    InventoryItemCreate,
    InventoryItemResponse,
    InventoryItemUpdate,
)
from app.schemas.inventory_transaction import (
    InventoryTransactionCreate,
    InventoryTransactionResponse,
)
from app.services.inventory_item_service import InventoryItemService
from app.services.inventory_transaction_service import (
    InventoryTransactionService,
)


router = APIRouter(
    prefix="/api/v1/farms/{farm_id}/inventory",
    tags=["Inventory"],
)


@router.post(
    "",
    response_model=InventoryItemResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory_item(
    farm_id: UUID,
    data: InventoryItemCreate,
    membership: FarmMembership = Depends(get_manageable_farm_membership),
    session: Session = Depends(get_db),
):
    service = InventoryItemService(session)
    return service.create(farm_id=farm_id, data=data)


@router.get(
    "",
    response_model=list[InventoryItemResponse],
)
def list_inventory_items(
    farm_id: UUID,
    search: str | None = Query(default=None, max_length=150),
    category: str | None = Query(default=None, max_length=50),
    is_active: bool | None = Query(default=True),
    low_stock_only: bool = Query(default=False),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    membership: FarmMembership = Depends(get_farm_membership),
    session: Session = Depends(get_db),
):
    service = InventoryItemService(session)
    return service.list_by_farm(
        farm_id=farm_id,
        search=search,
        category=category,
        is_active=is_active,
        low_stock_only=low_stock_only,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/{item_id}",
    response_model=InventoryItemResponse,
)
def get_inventory_item(
    farm_id: UUID,
    item_id: UUID,
    membership: FarmMembership = Depends(get_farm_membership),
    session: Session = Depends(get_db),
):
    service = InventoryItemService(session)
    return service.get_by_id_and_farm(
        item_id=item_id,
        farm_id=farm_id,
    )


@router.patch(
    "/{item_id}",
    response_model=InventoryItemResponse,
)
def update_inventory_item(
    farm_id: UUID,
    item_id: UUID,
    data: InventoryItemUpdate,
    membership: FarmMembership = Depends(get_manageable_farm_membership),
    session: Session = Depends(get_db),
):
    service = InventoryItemService(session)
    return service.update(
        item_id=item_id,
        farm_id=farm_id,
        data=data,
    )


@router.delete(
    "/{item_id}",
    response_model=InventoryItemResponse,
)
def deactivate_inventory_item(
    farm_id: UUID,
    item_id: UUID,
    membership: FarmMembership = Depends(get_manageable_farm_membership),
    session: Session = Depends(get_db),
):
    service = InventoryItemService(session)
    return service.deactivate(
        item_id=item_id,
        farm_id=farm_id,
    )


@router.post(
    "/{item_id}/transactions",
    response_model=InventoryTransactionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_inventory_transaction(
    farm_id: UUID,
    item_id: UUID,
    data: InventoryTransactionCreate,
    membership: FarmMembership = Depends(get_manageable_farm_membership),
    session: Session = Depends(get_db),
):
    service = InventoryTransactionService(session)
    return service.create(
        farm_id=farm_id,
        item_id=item_id,
        data=data,
    )


@router.get(
    "/{item_id}/transactions",
    response_model=list[InventoryTransactionResponse],
)
def list_inventory_transactions(
    farm_id: UUID,
    item_id: UUID,
    movement_type: InventoryMovementType | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    membership: FarmMembership = Depends(get_farm_membership),
    session: Session = Depends(get_db),
):
    service = InventoryTransactionService(session)
    return service.list_by_farm(
        farm_id=farm_id,
        item_id=item_id,
        movement_type=movement_type,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )
