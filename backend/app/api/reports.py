"""Farm reporting API endpoints."""

from datetime import date
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.field_dependencies import get_farm_membership
from app.db.session import get_db
from app.models.farm_membership import FarmMembership
from app.schemas.report import FarmOverviewReport
from app.services.report_service import ReportService


router = APIRouter(
    prefix="/api/v1/farms/{farm_id}/reports",
    tags=["Farm Reports"],
)


@router.get(
    "/overview",
    response_model=FarmOverviewReport,
    summary="Get farm overview report",
)
def get_farm_overview_report(
    farm_id: UUID,
    start_date: date | None = Query(
        default=None,
        description="Include records dated on or after this date.",
    ),
    end_date: date | None = Query(
        default=None,
        description="Include records dated on or before this date.",
    ),
    _membership: FarmMembership = Depends(get_farm_membership),
    session: Session = Depends(get_db),
) -> FarmOverviewReport:
    """Return farm statistics for an optional date range."""

    return ReportService(session).get_overview(
        farm_id=farm_id,
        start_date=start_date,
        end_date=end_date,
    )
