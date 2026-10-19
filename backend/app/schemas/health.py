from datetime import datetime
from pydantic import BaseModel, Field

class HealthResponse(BaseModel):
    status: str = Field(..., description="System overall operational health status: 'healthy' or 'degraded'")
    timestamp: datetime = Field(..., description="Current server UTC timestamp")
    version: str = Field(..., description="API software release version")
    database: str = Field(..., description="Relational SQLite database connectivity status ('connected' or error details)")
    ml_model_loaded: bool = Field(..., description="Boolean flag confirming if trained ML pipeline is active")

    model_config = {
        "json_schema_extra": {
            "example": {
                "status": "healthy",
                "timestamp": "2026-10-14T18:10:00Z",
                "version": "1.0.0",
                "database": "connected",
                "ml_model_loaded": False
            }
        }
    }
