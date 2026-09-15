from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field as PydanticField

from app.models.crop import CropStatus


class CropCreate(BaseModel):
    """Data required to create a crop."""

    name: str = PydanticField(
        min_length=2,
        max_length=150,
    )

    variety: str | None = PydanticField(
        default=None,
        max_length=150,
    )

    planting_date: date | None = None

    expected_harvest_date: date | None = None

    actual_harvest_date: date | None = None

    status: CropStatus = CropStatus.PLANNED

    area_hectares: float | None = PydanticField(
        default=None,
        gt=0,
        le=1_000_000,
    )

    expected_yield: float | None = PydanticField(
        default=None,
        gt=0,
        le=1_000_000_000,
    )

    notes: str | None = PydanticField(
        default=None,
        max_length=5000,
    )


class CropUpdate(BaseModel):
    """Data that can be changed on an existing crop."""

    name: str | None = PydanticField(
        default=None,
        min_length=2,
        max_length=150,
    )

    variety: str | None = PydanticField(
        default=None,
        max_length=150,
    )

    planting_date: date | None = None

    expected_harvest_date: date | None = None

    actual_harvest_date: date | None = None

    status: CropStatus | None = None

    area_hectares: float | None = PydanticField(
        default=None,
        gt=0,
        le=1_000_000,
    )

    expected_yield: float | None = PydanticField(
        default=None,
        gt=0,
        le=1_000_000_000,
    )

    notes: str | None = PydanticField(
        default=None,
        max_length=5000,
    )


class CropResponse(BaseModel):
    """Crop returned by the API."""

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    field_id: UUID
    name: str
    variety: str | None
    planting_date: date | None
    expected_harvest_date: date | None
    actual_harvest_date: date | None
    status: CropStatus
    area_hectares: float | None
    expected_yield: float | None
    notes: str | None
    created_at: datetime
    updated_at: datetime