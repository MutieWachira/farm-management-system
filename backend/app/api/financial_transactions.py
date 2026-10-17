
from datetime import date
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.api.farm_activity_dependencies import (
    get_farm_membership,
    get_manageable_farm_membership,
)
from app.db.session import get_db
from app.models.farm_membership import FarmMembership
from app.models.user import User
from app.schemas.financial_transaction import (
    FinancialCategory,
    FinancialSummaryItem,
    FinancialTransactionCreate,
    FinancialTransactionRead,
    FinancialTransactionUpdate,
)
from app.services.financial_transaction_service import (
    FinancialTransactionService,
)


router = APIRouter(
    prefix="/api/v1/farms/{farm_id}/finances",
    tags=["Farm Finances"],
)


@router.post(
    "",
    response_model=FinancialTransactionRead,
    status_code=status.HTTP_201_CREATED,
)
def create_financial_transaction(
    farm_id: UUID,
    data: FinancialTransactionCreate,
    membership: FarmMembership = Depends(
        get_manageable_farm_membership
    ),
    current_user: User = Depends(get_current_user),
    session: Session = Depends(get_db),
):
    service = FinancialTransactionService(session)

    return service.create(
        farm_id=farm_id,
        created_by_id=current_user.id,
        data=data,
    )


@router.get(
    "",
    response_model=list[FinancialTransactionRead],
)
def list_financial_transactions(
    farm_id: UUID,
    transaction_type: Literal["income", "expense"] | None = Query(
        default=None
    ),
    category: FinancialCategory | None = Query(default=None),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    membership: FarmMembership = Depends(get_farm_membership),
    session: Session = Depends(get_db),
):
    service = FinancialTransactionService(session)

    return service.list_transactions(
        farm_id=farm_id,
        transaction_type=transaction_type,
        category=category,
        start_date=start_date,
        end_date=end_date,
        limit=limit,
        offset=offset,
    )


@router.get(
    "/summary",
    response_model=list[FinancialSummaryItem],
)
def get_financial_summary(
    farm_id: UUID,
    membership: FarmMembership = Depends(get_farm_membership),
    session: Session = Depends(get_db),
):
    service = FinancialTransactionService(session)
    return service.get_totals(farm_id=farm_id)


@router.get(
    "/{transaction_id}",
    response_model=FinancialTransactionRead,
)
def get_financial_transaction(
    farm_id: UUID,
    transaction_id: UUID,
    membership: FarmMembership = Depends(get_farm_membership),
    session: Session = Depends(get_db),
):
    service = FinancialTransactionService(session)

    return service.get(
        farm_id=farm_id,
        transaction_id=transaction_id,
    )


@router.patch(
    "/{transaction_id}",
    response_model=FinancialTransactionRead,
)
def update_financial_transaction(
    farm_id: UUID,
    transaction_id: UUID,
    data: FinancialTransactionUpdate,
    membership: FarmMembership = Depends(
        get_manageable_farm_membership
    ),
    session: Session = Depends(get_db),
):
    service = FinancialTransactionService(session)

    return service.update(
        farm_id=farm_id,
        transaction_id=transaction_id,
        data=data,
    )


@router.delete(
    "/{transaction_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_financial_transaction(
    farm_id: UUID,
    transaction_id: UUID,
    membership: FarmMembership = Depends(
        get_manageable_farm_membership
    ),
    session: Session = Depends(get_db),
):
    service = FinancialTransactionService(session)

    service.delete(
        farm_id=farm_id,
        transaction_id=transaction_id,
    )

    return Response(status_code=status.HTTP_204_NO_CONTENT)

