from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.auth import router as auth_router
from app.core.config import get_settings
from app.api.farms import router as farm_router
from app.api.farm_members import router as farm_members_router
from app.api.fields import router as fields_router
from app.api.crops import router as crops_router


settings = get_settings()


app = FastAPI(
    title=settings.app_name,
    description="Farm Management System API",
    version=settings.app_version,
)


# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
# Allows the Next.js frontend to communicate with the FastAPI backend
# during development.
#
# Frontend:
#   http://localhost:3000
#
# Backend:
#   http://127.0.0.1:8000
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
         # Highly recommended: Add your local loopback address as well
        "http://127.0.0.1:3000" 
        "https://farm-management-system-swart-six.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(farm_router)
app.include_router(farm_members_router)
app.include_router(fields_router)
app.include_router(crops_router)

@app.get("/health")
async def health_check() -> dict[str, str]:
    """Return the health status of the API."""

    return {
        "status": "healthy",
        "service": "agricore-api",
        "version": settings.app_version,
    }