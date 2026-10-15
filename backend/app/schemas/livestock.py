
from datetime import date, datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.livestock import LivestockStatus


class LivestockBase(BaseModel):
    """Shared fields and validation for livestock records."""

    name: str = Field(min_length=1, max_length=150)
    species: str = Field(min_length=1, max_length=50)
    breed: str | None = Field(default=None, max_length=100)
    tag_number: str | None = Field(default=None, max_length=80)
    quantity: int = Field(default=1, gt=0)
    sex: str | None = Field(default=None, max_length=20)
    birth_date: date | None = None
    acquisition_date: date | None = None
    purpose: str | None = Field(default=None, max_length=50)
    notes: str | None = None

    @field_validator("name", "species")
    @classmethod
    def strip_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value

    @field_validator("breed", "tag_number", "sex", "purpose", "notes")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("birth_date", "acquisition_date")
    @classmethod
    def reject_future_dates(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("The date cannot be in the future.")
        return value


class LivestockCreate(LivestockBase):
    """Fields accepted when registering livestock."""

    status: LivestockStatus = LivestockStatus.ACTIVE


class LivestockUpdate(BaseModel):
    """Optional fields accepted when updating a livestock record."""

    name: str | None = Field(default=None, min_length=1, max_length=150)
    species: str | None = Field(default=None, min_length=1, max_length=50)
    breed: str | None = Field(default=None, max_length=100)
    tag_number: str | None = Field(default=None, max_length=80)
    quantity: int | None = Field(default=None, gt=0)
    sex: str | None = Field(default=None, max_length=20)
    birth_date: date | None = None
    acquisition_date: date | None = None
    purpose: str | None = Field(default=None, max_length=50)
    status: LivestockStatus | None = None
    notes: str | None = None

    @field_validator("name", "species")
    @classmethod
    def strip_required_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if not value:
            raise ValueError("This field cannot be blank.")
        return value

    @field_validator("breed", "tag_number", "sex", "purpose", "notes")
    @classmethod
    def strip_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @field_validator("birth_date", "acquisition_date")
    @classmethod
    def reject_future_dates(cls, value: date | None) -> date | None:
        if value is not None and value > date.today():
            raise ValueError("The date cannot be in the future.")
        return value


class LivestockResponse(LivestockBase):
    """Fields returned to API clients."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    farm_id: UUID
    status: LivestockStatus
    created_at: datetime
    updated_at: datetime
