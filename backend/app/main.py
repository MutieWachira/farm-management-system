from fastapi import FastAPI

app = FastAPI(
    title= "AgriCore API",
    description="Farm Manageent System API",
    version="0.1.0",
)

@app.get("/health")
async def health_check() -> dict[str, str]:
    """
    Return the health status of the API
    """
    return{
        "status": "healthy",
        "service":"agricore-api",
        "version":"0.1.0",
    }