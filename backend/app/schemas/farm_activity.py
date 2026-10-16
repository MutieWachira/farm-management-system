from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field as PydanticField

from app.models.farm_activity import ActivityType

class FarmActivityCreate(BaseModel):
    field_id: UUID | None = None
    crop_id: UUID | None = None
    activity_type: ActivityType
    activity_date: date
    title: str = PydanticField(min_length=2, max_length=150,)
    description: str | None = PydanticField(default=None, max_length=5000,)
    quantity: float | None = PydanticField(default=None, gt=0, le=1000000000,)
    unit: str | None = PydanticField(default=None, max_length=50,)
    cost: float | None = PydanticField(default=None, ge=0, le=1000000000,)


class FarmActivityUpdate(BaseModel):
    field_id: UUID | None
    crop_id: UUID | None
    activity_type: ActivityType | None = None
    activity_date: date | None = None
    title: str | None = PydanticField(
        default=None,
        min_length=2,
        max_length=150,
    )
    description: str | None = PydanticField(
        default=None,
        max_length=5000,
    )
    quantity: float | None = PydanticField(
        default=None,
        gt=0,
        le=1000000000,
    )
    unit: str | None = PydanticField(
        default=None,
        max_length=50,
    )
    cost: float | None = PydanticField(
        default=None,
        ge=0,
        le=1000000000,
    )


class FarmActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    farm_id: UUID
    field_id: UUID | None
    crop_id: UUID | None
    activity_type: ActivityType
    activity_date: date
    title: str
    description: str | None
    quantity: float | None
    unit: str | None  
    cost: float | None
    created_at: datetime
    updated_at: datetime  
