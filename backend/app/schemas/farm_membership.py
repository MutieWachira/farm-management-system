from datetime import datetime
from uuid import UUID
from pydantic import BaseModel, ConfigDict
from app.core.enums import FarmRole

class AddFarmMemberRequest(BaseModel):
    """Request to add a user to farm"""
    email: str
    role: FarmRole = FarmRole.VIEWER

class UpdateFarmMemberRequest(BaseModel):
    """Request to change a member's role."""

    role: FarmRole


class FarmMemberResponse(BaseModel):
    """Public farm-member representation."""

    model_config = ConfigDict(
        from_attributes=True,
    )

    id: UUID
    farm_id: UUID
    user_id: UUID
    role: FarmRole
    joined_at: datetime
    email: str
