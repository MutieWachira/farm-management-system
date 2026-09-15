import json
from urllib.parse import parse_qs

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
    RefreshTokenRequest,
)
from app.services.auth_service import (
    AuthenticationError,
    AuthService,
    UserAlreadyExistsError,
)

router = APIRouter(
    prefix="/api/v1/auth",
    tags=["Authentication"],
)


@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
)
def register(
    data: RegisterRequest,
    session: Session = Depends(get_db),
) -> User:
    """Register a new AgriCore user."""

    service = AuthService(session)

    try:
        return service.register(data)
    except UserAlreadyExistsError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=str(exc),
        ) from exc


@router.post(
    "/login",
    response_model=TokenResponse,
)
async def login(
    request: Request,
    session: Session = Depends(get_db),
) -> TokenResponse:
    """Authenticate a user."""

    content_type = request.headers.get("content-type", "")
    body = await request.body()

    if "application/x-www-form-urlencoded" in content_type:
        form_data = parse_qs(body.decode(), keep_blank_values=True)
        data = LoginRequest(
            email=form_data.get("username", form_data.get("email", [""]))[0],
            password=form_data.get("password", [""])[0],
        )
    else:
        data = LoginRequest.model_validate(json.loads(body))

    service = AuthService(session)

    try:
        access_token, refresh_token = service.authenticate(
            email=data.email,
            password=data.password,
        )
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.get(
    "/me",
    response_model=UserResponse,
)
def get_me(
    current_user: User = Depends(get_current_user),
) -> User:
    """Return the authenticated user."""
    return current_user


@router.post(
    "/refresh",
    response_model=TokenResponse,
)
def refresh(
    data: RefreshTokenRequest,
    session: Session = Depends(get_db),
) -> TokenResponse:
    """Rotate a refresh token."""

    service = AuthService(session)

    try:
        access_token, refresh_token = service.refresh(
            data.refresh_token,
        )
    except AuthenticationError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(exc),
        ) from exc

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
    )


@router.post("/logout")
def logout(
    data: RefreshTokenRequest,
    session: Session = Depends(get_db),
) -> dict[str, str]:
    """Revoke a refresh token."""

    AuthService(session).logout(
        data.refresh_token,
    )

    return {
        "message": "Successfully logged out.",
    }