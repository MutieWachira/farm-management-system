from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

class FarmCreate(BaseModel):
    """Request payload for creating a farm"""
    name: str = Field(min_length=2, max_length=150)

    location: str = Field(min_length=2, max_length=255)

    area_hectares: float | None = Field(
        default=None,
        gt=0,
        le=1_000_000,
    )

    description: str | None = Field(default=None, max_length=2000)

class FarmUpdate(BaseModel):
    """Request payload for updationg a farm"""
    name: str | None = Field(default=None, min_length=2, max_length=150)
    location: str | None = Field(default=None, min_length=2, max_length=255)
    area_hectares: float | None = Field(default=None, gt=0, le=1_000_000) 
    description: str | None = Field(default=None, max_length=2000)

class FarmResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True,)
    id: UUID
    owner_id: UUID
    name: str
    location: str
    area_hectares: float | None
    description: str | None
    created_at: datetime
    updated_at: datetime