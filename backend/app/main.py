from fastapi import FastAPI

from app.api.auth import router as auth_router
from app.core.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    description="Farm Management System API",
    version=settings.app_version,
)

app.include_router(auth_router)


@app.get("/health")
async def health_check() -> dict[str, str]:
    """Return the health status of the API."""

    return {
        "status": "healthy",
        "service": "agricore-api",
        "version": settings.app_version,
    }
