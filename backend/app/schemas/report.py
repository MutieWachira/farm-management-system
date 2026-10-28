"""Validated response schemas for farm reports."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ReportPeriod(BaseModel):
    """Date range used to generate a report."""

    start_date: date | None
    end_date: date | None


class FarmReportInfo(BaseModel):
    """Basic information about the farm."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    location: str
    area_hectares: float | None
    created_at: datetime


class FieldReportSummary(BaseModel):
    """Farm-wide field statistics."""

    total_fields: int
    active_fields: int
    fallow_fields: int
    inactive_fields: int
    total_field_area_hectares: float


class ActivityReportSummary(BaseModel):
    """Activity statistics within the selected date range."""

    total_activities: int
    activities_by_type: dict[str, int]


class IrrigationReportSummary(BaseModel):
    """Irrigation statistics within the selected date range."""

    total_sessions: int
    total_duration_minutes: int
    total_water_volume_liters: float


class FinancialCurrencySummary(BaseModel):
    """Financial totals kept separate for each currency."""

    currency_code: str
    total_income: Decimal
    total_expenses: Decimal
    net_balance: Decimal


class FarmOverviewReport(BaseModel):
    """Complete overview report for one farm."""

    period: ReportPeriod
    farm: FarmReportInfo
    fields: FieldReportSummary
    activities: ActivityReportSummary
    irrigation: IrrigationReportSummary
    finances: list[FinancialCurrencySummary]
