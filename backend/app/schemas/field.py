
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field as PydanticField

from app.models.field import FieldStatus


class FieldCreate(BaseModel):
    """Data required to create a field."""

    name: str = PydanticField(
        min_length=2,
        max_length=150,
    )

    area_hectares: float = PydanticField(
        gt=0,
        le=1_000_000,
    )

    soil_type: str | None = PydanticField(
        default=None,
        max_length=100,
    )

    status: FieldStatus = FieldStatus.ACTIVE


class FieldUpdate(BaseModel):
    """Data that can be changed on an existing field."""

    name: str | None = PydanticField(
        default=None,
        min_length=2,
        max_length=150,
    )

    area_hectares: float | None = PydanticField(
        default=None,
        gt=0,
        le=1_000_000,
    )

    soil_type: str | None = PydanticField(
        default=None,
        max_length=100,
    )

    status: FieldStatus | None = None


class FieldResponse(BaseModel):
    """Field returned by the API."""

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    farm_id: UUID
    name: str
    area_hectares: float
    soil_type: str | None
    status: FieldStatus
    created_at: datetime
    updated_at: datetime

