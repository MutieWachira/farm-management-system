from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterRequest(BaseModel):
    """Request body for user registration"""

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    first_name: str = Field(min_length=1, max_length=128)
    last_name: str = Field(min_length=1, max_length=128)


class UserResponse(BaseModel):
    """Public representation of a user"""

    model_config = ConfigDict(from_attribute=True)
    id: UUID
    email: EmailStr
    first_name: str
    last_name: str
    is_active: bool


class TokenResponse(BaseModel):
    """Authentication token response"""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    """Request body for user login."""

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)
