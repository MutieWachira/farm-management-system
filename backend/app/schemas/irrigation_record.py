"""Pydantic schemas for irrigation records."""

from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field as PydanticField


class IrrigationRecordCreate(BaseModel):
    """Data required to create an irrigation record."""

    field_id: UUID
    irrigation_date: date
    method: str = PydanticField(min_length=2, max_length=50)
    duration_minutes: int = PydanticField(gt=0, le=1440)
    water_volume_liters: float = PydanticField(
        gt=0,
        le=1_000_000_000,
    )
    notes: str | None = PydanticField(default=None, max_length=5000)


class IrrigationRecordUpdate(BaseModel):
    """Fields that can be updated on an irrigation record."""

    field_id: UUID | None = None
    irrigation_date: date | None = None
    method: str | None = PydanticField(
        default=None,
        min_length=2,
        max_length=50,
    )
    duration_minutes: int | None = PydanticField(
        default=None,
        gt=0,
        le=1440,
    )
    water_volume_liters: float | None = PydanticField(
        default=None,
        gt=0,
        le=1_000_000_000,
    )
    notes: str | None = PydanticField(
        default=None,
        max_length=5000,
    )


class IrrigationRecordResponse(BaseModel):
    """Irrigation record returned by the API."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farm_id: UUID
    field_id: UUID
    irrigation_date: date
    method: str
    duration_minutes: int
    water_volume_liters: float
    notes: str | None
    created_at: datetime
    updated_at: datetime
