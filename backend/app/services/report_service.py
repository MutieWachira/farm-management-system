"""Business logic for generating farm overview reports."""

from datetime import date
from decimal import Decimal
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.farm import Farm
from app.models.field import Field, FieldStatus
from app.models.farm_activity import FarmActivity
from app.models.irrigation_record import IrrigationRecord
from app.models.financial_transaction import FinancialTransaction
from app.schemas.report import (
    ActivityReportSummary,
    FarmOverviewReport,
    FarmReportInfo,
    FieldReportSummary,
    FinancialCurrencySummary,
    IrrigationReportSummary,
    ReportPeriod,
)


class ReportService:
    """Generate read-only, farm-scoped reports."""

    def __init__(self, session: Session) -> None:
        self.session = session

    @staticmethod
    def validate_period(
        start_date: date | None,
        end_date: date | None,
    ) -> None:
        """Reject date ranges whose start comes after their end."""

        if (
            start_date is not None
            and end_date is not None
            and start_date > end_date
        ):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Start date must not be after end date.",
            )

    @staticmethod
    def _apply_date_filter(
        statement,
        date_column,
        start_date: date | None,
        end_date: date | None,
    ):
        """Apply inclusive date boundaries to a SQLAlchemy statement."""

        if start_date is not None:
            statement = statement.where(date_column >= start_date)

        if end_date is not None:
            statement = statement.where(date_column <= end_date)

        return statement

    def get_overview(
        self,
        *,
        farm_id: UUID,
        start_date: date | None = None,
        end_date: date | None = None,
    ) -> FarmOverviewReport:
        """Calculate a farm overview report without modifying data."""

        self.validate_period(start_date, end_date)

        farm = self.session.scalar(
            select(Farm).where(Farm.id == farm_id)
        )

        if farm is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Farm not found.",
            )

        # Count fields by their stored status and total registered area.
        field_rows = self.session.execute(
            select(
                Field.status,
                func.count(Field.id),
                func.coalesce(func.sum(Field.area_hectares), 0.0),
            )
            .where(Field.farm_id == farm_id)
            .group_by(Field.status)
        ).all()

        # Initialise all status counts so empty categories return zero.
        field_counts = {
            FieldStatus.ACTIVE.value: 0,
            FieldStatus.FALLOW.value: 0,
            FieldStatus.INACTIVE.value: 0,
        }
        total_fields = 0
        total_field_area = 0.0

        for field_status, count, area in field_rows:
            status_value = (
                field_status.value
                if isinstance(field_status, FieldStatus)
                else str(field_status)
            )
            field_counts[status_value] = count
            total_fields += count
            total_field_area += float(area or 0.0)

        fields_summary = FieldReportSummary(
            total_fields=total_fields,
            active_fields=field_counts[FieldStatus.ACTIVE.value],
            fallow_fields=field_counts[FieldStatus.FALLOW.value],
            inactive_fields=field_counts[FieldStatus.INACTIVE.value],
            total_field_area_hectares=total_field_area,
        )

        # Activity counts grouped by activity type.
        activity_statement = select(
            FarmActivity.activity_type,
            func.count(FarmActivity.id),
        ).where(FarmActivity.farm_id == farm_id)

        activity_statement = self._apply_date_filter(
            activity_statement,
            FarmActivity.activity_date,
            start_date,
            end_date,
        )

        activity_rows = self.session.execute(
            activity_statement.group_by(FarmActivity.activity_type)
        ).all()

        activities_by_type: dict[str, int] = {}

        for activity_type, count in activity_rows:
            type_value = (
                activity_type.value
                if hasattr(activity_type, "value")
                else str(activity_type)
            )
            activities_by_type[type_value] = count

        activities_summary = ActivityReportSummary(
            total_activities=sum(activities_by_type.values()),
            activities_by_type=activities_by_type,
        )

        # Irrigation totals for the selected period.
        irrigation_statement = select(
            func.count(IrrigationRecord.id),
            func.coalesce(
                func.sum(IrrigationRecord.duration_minutes),
                0,
            ),
            func.coalesce(
                func.sum(IrrigationRecord.water_volume_liters),
                0.0,
            ),
        ).where(IrrigationRecord.farm_id == farm_id)

        irrigation_statement = self._apply_date_filter(
            irrigation_statement,
            IrrigationRecord.irrigation_date,
            start_date,
            end_date,
        )

        irrigation_row = self.session.execute(
            irrigation_statement
        ).one()

        irrigation_summary = IrrigationReportSummary(
            total_sessions=irrigation_row[0],
            total_duration_minutes=irrigation_row[1],
            total_water_volume_liters=float(irrigation_row[2] or 0.0),
        )

        # Aggregate financial totals by currency and transaction type.
        finance_statement = select(
            FinancialTransaction.currency_code,
            FinancialTransaction.transaction_type,
            func.sum(FinancialTransaction.amount),
        ).where(FinancialTransaction.farm_id == farm_id)

        finance_statement = self._apply_date_filter(
            finance_statement,
            FinancialTransaction.transaction_date,
            start_date,
            end_date,
        )

        finance_rows = self.session.execute(
            finance_statement.group_by(
                FinancialTransaction.currency_code,
                FinancialTransaction.transaction_type,
            )
        ).all()

        totals: dict[str, dict[str, Decimal]] = {}

        for currency_code, transaction_type, amount in finance_rows:
            currency_totals = totals.setdefault(
                currency_code,
                {
                    "income": Decimal("0.00"),
                    "expense": Decimal("0.00"),
                },
            )

            currency_totals[transaction_type] += (
                amount if amount is not None else Decimal("0.00")
            )

        finances_summary = [
            FinancialCurrencySummary(
                currency_code=currency_code,
                total_income=currency_totals["income"],
                total_expenses=currency_totals["expense"],
                net_balance=(
                    currency_totals["income"]
                    - currency_totals["expense"]
                ),
            )
            for currency_code, currency_totals in sorted(totals.items())
        ]

        return FarmOverviewReport(
            period=ReportPeriod(
                start_date=start_date,
                end_date=end_date,
            ),
            farm=FarmReportInfo.model_validate(farm),
            fields=fields_summary,
            activities=activities_summary,
            irrigation=irrigation_summary,
            finances=finances_summary,
        )
